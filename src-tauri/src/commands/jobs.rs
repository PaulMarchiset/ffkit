use crate::ffmpeg::presets::preset_args;
use crate::ffmpeg::raw_args::build_raw_args;
use crate::ffmpeg::reader::run_job_reader;
use crate::ffmpeg::runner::get_duration_ms;
use crate::state::{AppState, JobEntry, JobState, JobStatus};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct JobSpec {
    pub input_path: String,
    pub output_path: String,
    pub mode: JobMode,
    pub quality: Option<String>,
    /// Raw-mode command template (with {input}/{output} placeholders). The
    /// backend substitutes + tokenizes it (see ffmpeg::raw_args::build_raw_args).
    pub raw_template: Option<String>,
    /// Duration in ms, already known from the file probe at load time. When
    /// present we skip the redundant ffprobe; absent (or 0), we fall back to it.
    pub total_duration_ms: Option<i64>,
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
    let slot = state.scheduler.try_reserve().map_err(|limit| {
        format!("Job limit ({limit}) reached. Please wait for the current job to finish.")
    })?;

    let encoder = resolve_encoder(&state).await;
    let args = build_args(&spec, &encoder)?;
    // Reuse the duration the frontend already probed at file-load time; only
    // re-probe when it's missing so progress/ETA still work for those files.
    let total_ms = match spec.total_duration_ms {
        Some(ms) if ms > 0 => Some(ms),
        _ => get_duration_ms(&app, &spec.input_path).await,
    };

    eprintln!("[ffkit] ffmpeg {}", args.join(" "));

    let (rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args(&args)
        .spawn()
        .map_err(|e| e.to_string())?;

    let job_id = uuid::Uuid::new_v4().to_string();
    register_job(&state, &job_id, &spec, child).await;

    let jobs_map = state.jobs.clone();
    let app2 = app.clone();
    let jid = job_id.clone();
    tokio::spawn(async move {
        let _slot = slot; // released when the reader returns
        run_job_reader(rx, jid, jobs_map, app2, total_ms).await;
    });

    Ok(job_id)
}

#[tauri::command]
pub async fn cancel_job(
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut jobs = state.jobs.lock().await;
    let entry = jobs
        .get_mut(&id)
        .ok_or_else(|| format!("Job {id} not found"))?;
    entry.status.state = JobState::Cancelled;
    if let Some(child) = entry.child.take() {
        let _ = child.kill();
    }
    Ok(())
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
    const SOFTWARE: &str = "libx264";
    let settings = state.settings.lock().await;
    if settings.hardware_accel == "software" {
        return SOFTWARE.to_string();
    }
    let list = state.encoder_list.lock().await;
    let Some(ref l) = *list else { return SOFTWARE.to_string(); };

    if settings.hardware_accel == "auto" {
        if let Some(best) = &l.best_h264 {
            return best.clone();
        }
    } else if l.available.iter().any(|e| e.name == settings.hardware_accel) {
        return settings.hardware_accel.clone();
    }
    SOFTWARE.to_string()
}

async fn register_job(
    state: &tauri::State<'_, AppState>,
    job_id: &str,
    spec: &JobSpec,
    child: tauri_plugin_shell::process::CommandChild,
) {
    let mut jobs = state.jobs.lock().await;
    jobs.insert(
        job_id.to_string(),
        JobEntry {
            status: JobStatus {
                id: job_id.to_string(),
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

fn build_args(spec: &JobSpec, encoder: &str) -> Result<Vec<String>, String> {
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
            // The backend owns substitution + tokenization (the template already
            // contains -i; {input}/{output} are filled here, not by the frontend).
            if let Some(template) = &spec.raw_template {
                args.extend(build_raw_args(template, &spec.input_path, &spec.output_path));
            }
        }
    }

    Ok(args)
}

