use crate::ffmpeg::presets::preset_args;
use crate::ffmpeg::progress::ProgressAccumulator;
use crate::ffmpeg::runner::get_duration_ms;
use crate::state::{AppState, JobEntry, JobState, JobStatus, JobsMap};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct JobSpec {
    pub input_path: String,
    pub output_path: String,
    pub mode: JobMode,
    pub quality: Option<String>,
    pub raw_args: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum JobMode {
    Preset,
    Raw,
}

#[tauri::command]
pub async fn start_job(
    spec: JobSpec,
    state: tauri::State<'_, AppState>,
    app: AppHandle,
) -> Result<String, String> {
    // Enforce concurrent job limit.
    {
        let settings = state.settings.lock().await;
        let jobs = state.jobs.lock().await;
        let running = jobs
            .values()
            .filter(|e| e.status.state == JobState::Running)
            .count();
        if running >= settings.concurrent_jobs as usize {
            return Err(format!(
                "Job limit ({}) reached. Please wait for the current job to finish.",
                settings.concurrent_jobs
            ));
        }
    }

    let job_id = uuid::Uuid::new_v4().to_string();

    // Determine the encoder to use.
    let encoder = resolve_encoder(&state).await;

    // Build ffmpeg arg list.
    let args = build_args(&spec, &encoder)?;

    // Get input duration for ETA.
    let total_ms = get_duration_ms(&app, &spec.input_path).await;

    // Log the command for debugging.
    eprintln!("[ffkit] ffmpeg {}", args.join(" "));

    // Spawn the sidecar.
    let cmd = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args(&args);

    let (rx, child) = cmd.spawn().map_err(|e| e.to_string())?;

    // Register the job.
    {
        let mut jobs = state.jobs.lock().await;
        jobs.insert(
            job_id.clone(),
            JobEntry {
                status: JobStatus {
                    id: job_id.clone(),
                    input_path: spec.input_path.clone(),
                    output_path: spec.output_path.clone(),
                    state: JobState::Running,
                    progress: 0.0,
                    speed: 0.0,
                    eta_secs: 0.0,
                    output_size: 0,
                    error: None,
                },
                child: Some(child),
            },
        );
    }

    // Spawn background reader task.
    let jobs_map = state.jobs.clone();
    let app2 = app.clone();
    let jid = job_id.clone();
    tokio::spawn(async move {
        run_reader(rx, jid, jobs_map, app2, total_ms).await;
    });

    Ok(job_id)
}

#[tauri::command]
pub async fn cancel_job(
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut jobs = state.jobs.lock().await;
    if let Some(entry) = jobs.get_mut(&id) {
        entry.status.state = JobState::Cancelled;
        if let Some(child) = entry.child.take() {
            let _ = child.kill();
        }
        Ok(())
    } else {
        Err(format!("Job {id} not found"))
    }
}

#[tauri::command]
pub async fn list_jobs(state: tauri::State<'_, AppState>) -> Result<Vec<JobStatus>, String> {
    let jobs = state.jobs.lock().await;
    let mut statuses: Vec<_> = jobs.values().map(|e| e.status.clone()).collect();
    statuses.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(statuses)
}

#[tauri::command]
pub async fn clear_job(
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut jobs = state.jobs.lock().await;
    match jobs.get(&id) {
        Some(entry) => {
            if entry.status.state == JobState::Running || entry.status.state == JobState::Queued {
                return Err(format!("Job {id} is still active; cancel it first"));
            }
            jobs.remove(&id);
            Ok(())
        }
        None => Ok(()),
    }
}

// ── helpers ────────────────────────────────────────────────────────────────

async fn resolve_encoder(state: &tauri::State<'_, AppState>) -> String {
    let settings = state.settings.lock().await;
    if settings.hardware_accel == "software" {
        return "libx264".to_string();
    }
    let list = state.encoder_list.lock().await;
    if let Some(ref l) = *list {
        if settings.hardware_accel == "auto" {
            if let Some(best) = &l.best_h264 {
                return best.clone();
            }
        } else if l.available.iter().any(|e| e.name == settings.hardware_accel) {
            return settings.hardware_accel.clone();
        }
    }
    "libx264".to_string()
}

fn build_args(spec: &JobSpec, encoder: &str) -> Result<Vec<String>, String> {
    // Global flags first (before -i).
    let mut args = vec![
        "-y".to_string(),
        "-progress".to_string(),
        "pipe:1".to_string(),
    ];

    match spec.mode {
        JobMode::Preset => {
            args.push("-i".to_string());
            args.push(spec.input_path.clone());
            let quality = spec.quality.as_deref().unwrap_or("medium");
            args.extend(preset_args(quality, encoder));
            args.push(spec.output_path.clone());
        }
        JobMode::Raw => {
            // raw_args already contain -i, paths substituted by frontend.
            if let Some(raw) = &spec.raw_args {
                args.extend(raw.clone());
            }
        }
    }

    Ok(args)
}

async fn run_reader(
    mut rx: tokio::sync::mpsc::Receiver<CommandEvent>,
    job_id: String,
    jobs: JobsMap,
    app: AppHandle,
    total_ms: Option<i64>,
) {
    let mut acc = ProgressAccumulator::new();
    let mut stderr_lines: Vec<String> = Vec::new();

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                for update in acc.feed(&bytes) {
                    let percentage = total_ms
                        .filter(|&t| t > 0)
                        .map(|t| (update.out_time_ms as f64 / t as f64 * 100.0).min(99.9))
                        .unwrap_or(0.0);

                    let eta_secs = if update.speed > 0.0 {
                        total_ms
                            .map(|t| {
                                let remaining_ms = (t - update.out_time_ms).max(0);
                                remaining_ms as f64 / 1000.0 / update.speed
                            })
                            .unwrap_or(0.0)
                    } else {
                        0.0
                    };

                    {
                        let mut jobs = jobs.lock().await;
                        if let Some(entry) = jobs.get_mut(&job_id) {
                            entry.status.progress = percentage;
                            entry.status.speed = update.speed;
                            entry.status.eta_secs = eta_secs;
                            entry.status.output_size = update.total_size;
                        }
                    }

                    let _ = app.emit(
                        "job-progress",
                        serde_json::json!({
                            "jobId": job_id,
                            "frame": update.frame,
                            "fps": update.fps,
                            "speed": update.speed,
                            "outTimeMs": update.out_time_ms,
                            "totalSize": update.total_size,
                            "percentage": percentage,
                            "etaSecs": eta_secs,
                            "done": update.done,
                        }),
                    );
                }
            }
            CommandEvent::Stderr(bytes) => {
                let line = String::from_utf8_lossy(&bytes).to_string();
                stderr_lines.push(line.clone());
                let _ = app.emit(
                    "job-log",
                    serde_json::json!({ "jobId": job_id, "line": line }),
                );
            }
            CommandEvent::Terminated(status) => {
                let success = status.code.map(|c| c == 0).unwrap_or(false);
                let cancelled = {
                    let jobs = jobs.lock().await;
                    jobs.get(&job_id)
                        .map(|e| e.status.state == JobState::Cancelled)
                        .unwrap_or(false)
                };

                let mut jobs = jobs.lock().await;
                if let Some(entry) = jobs.get_mut(&job_id) {
                    if !cancelled {
                        if success {
                            entry.status.state = JobState::Done;
                            entry.status.progress = 100.0;
                        } else {
                            entry.status.state = JobState::Failed;
                            entry.status.error = stderr_lines.last().cloned();
                        }
                    }
                    entry.child = None;

                    let _ = app.emit(
                        "job-done",
                        serde_json::json!({
                            "jobId": job_id,
                            "success": success && !cancelled,
                            "cancelled": cancelled,
                            "outputPath": entry.status.output_path,
                            "error": entry.status.error,
                        }),
                    );
                }
                break;
            }
            _ => {}
        }
    }
}
