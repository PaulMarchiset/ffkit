use crate::ffmpeg::encoders::EncoderList;
use crate::ffmpeg::presets::preset_args;
use crate::ffmpeg::raw_args::build_raw_args;
use crate::ffmpeg::reader::run_job_reader;
use crate::ffmpeg::runner::get_duration_ms;
use crate::state::{AppState, JobEntry, JobScheduler, JobState, JobStatus, JobsMap, Settings};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::ShellExt;
use tokio::sync::Mutex;

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

/// Start a single conversion. Returns its job id immediately; the job is
/// registered as `Queued` and begins as soon as an admission slot is free.
#[tauri::command]
pub async fn start_job(
    spec: JobSpec,
    state: tauri::State<'_, AppState>,
    app: AppHandle,
) -> Result<String, String> {
    Ok(enqueue_job(&state, &app, spec).await)
}

/// Start a batch of conversions with (per-spec) settings. Every job is queued
/// up front; the scheduler runs up to `concurrent_jobs` at a time and promotes
/// the rest as slots free. Returns the job ids in input order.
#[tauri::command]
pub async fn start_jobs(
    specs: Vec<JobSpec>,
    state: tauri::State<'_, AppState>,
    app: AppHandle,
) -> Result<Vec<String>, String> {
    let mut ids = Vec::with_capacity(specs.len());
    for spec in specs {
        ids.push(enqueue_job(&state, &app, spec).await);
    }
    Ok(ids)
}

#[tauri::command]
pub async fn cancel_job(
    id: String,
    state: tauri::State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    let (had_child, output_path) = {
        let mut jobs = state.jobs.lock().await;
        let entry = jobs
            .get_mut(&id)
            .ok_or_else(|| format!("Job {id} not found"))?;
        entry.status.state = JobState::Cancelled;
        let had_child = entry.child.take().map(|c| c.kill().ok()).is_some();
        (had_child, entry.status.output_path.clone())
    };

    // A running job's reader sees the killed child terminate and emits job-done.
    // A still-queued job has no reader, so emit the cancelled done here (its task
    // will notice the Cancelled state when it finally acquires a slot and bail).
    if !had_child {
        emit_done(&app, &id, false, true, &output_path, &None);
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

/// Register a job in the `Queued` state and spawn the background task that waits
/// for an admission slot, then runs ffmpeg. Returns the new job id.
async fn enqueue_job(state: &tauri::State<'_, AppState>, app: &AppHandle, spec: JobSpec) -> String {
    let job_id = uuid::Uuid::new_v4().to_string();
    register_queued(&state.jobs, &job_id, &spec).await;
    spawn_job_task(
        job_id.clone(),
        spec,
        state.scheduler.clone(),
        state.jobs.clone(),
        state.settings.clone(),
        state.encoder_list.clone(),
        app.clone(),
    );
    job_id
}

/// Wait for an admission slot, then drive the job to completion. Owns the slot
/// for the whole run; dropping it (when the reader returns) wakes a queued job.
#[allow(clippy::too_many_arguments)]
fn spawn_job_task(
    job_id: String,
    spec: JobSpec,
    scheduler: Arc<JobScheduler>,
    jobs: JobsMap,
    settings: Arc<Mutex<Settings>>,
    encoder_list: Arc<Mutex<Option<EncoderList>>>,
    app: AppHandle,
) {
    tokio::spawn(async move {
        let slot = scheduler.acquire().await;

        // Cancelled while queued? cancel_job already emitted the done event, so
        // just release the slot and bail.
        if is_cancelled(&jobs, &job_id).await {
            return;
        }

        let encoder = resolve_encoder_from(&settings, &encoder_list).await;
        let args = match build_args(&spec, &encoder) {
            Ok(args) => args,
            Err(e) => return fail_job(&app, &jobs, &job_id, &spec.output_path, e).await,
        };

        // Reuse the duration the frontend already probed at file-load time; only
        // re-probe when it's missing so progress/ETA still work for those files.
        let total_ms = match spec.total_duration_ms {
            Some(ms) if ms > 0 => Some(ms),
            _ => get_duration_ms(&app, &spec.input_path).await,
        };

        eprintln!("[ffkit] ffmpeg {}", args.join(" "));

        let spawned = app
            .shell()
            .sidecar("ffmpeg")
            .map_err(|e| e.to_string())
            .and_then(|cmd| cmd.args(&args).spawn().map_err(|e| e.to_string()));
        let (rx, child) = match spawned {
            Ok(pair) => pair,
            Err(e) => return fail_job(&app, &jobs, &job_id, &spec.output_path, e).await,
        };

        mark_running(&jobs, &job_id, child).await;

        let _slot = slot; // released when the reader returns
        run_job_reader(rx, job_id, jobs, app, total_ms).await;
    });
}

pub(crate) async fn resolve_encoder(state: &tauri::State<'_, AppState>) -> String {
    resolve_encoder_from(&state.settings, &state.encoder_list).await
}

/// Pick the ffmpeg encoder for the current settings + detected hardware. Takes
/// the raw state Arcs (not `tauri::State`) so it's callable from spawned tasks.
pub(crate) async fn resolve_encoder_from(
    settings: &Mutex<Settings>,
    encoder_list: &Mutex<Option<EncoderList>>,
) -> String {
    const SOFTWARE: &str = "libx264";
    let settings = settings.lock().await;
    if settings.hardware_accel == "software" {
        return SOFTWARE.to_string();
    }
    let list = encoder_list.lock().await;
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

async fn register_queued(jobs: &JobsMap, job_id: &str, spec: &JobSpec) {
    let mut jobs = jobs.lock().await;
    jobs.insert(
        job_id.to_string(),
        JobEntry {
            status: JobStatus {
                id: job_id.to_string(),
                input_path: spec.input_path.clone(),
                output_path: spec.output_path.clone(),
                state: JobState::Queued,
                progress: 0.0,
                speed: 0.0,
                eta_secs: 0.0,
                output_size: 0,
                error: None,
            },
            child: None,
        },
    );
}

async fn mark_running(
    jobs: &JobsMap,
    job_id: &str,
    child: tauri_plugin_shell::process::CommandChild,
) {
    let mut jobs = jobs.lock().await;
    if let Some(entry) = jobs.get_mut(job_id) {
        entry.status.state = JobState::Running;
        entry.child = Some(child);
    }
}

/// Whether a just-dequeued job should *not* run: explicitly cancelled, or its
/// entry already removed. The entry is removed only after a job reaches a
/// terminal state (see `clear_job`), so a missing entry while we were queued
/// means it was cancelled-then-cleared — bail rather than run a stale job.
async fn is_cancelled(jobs: &JobsMap, job_id: &str) -> bool {
    let jobs = jobs.lock().await;
    match jobs.get(job_id) {
        Some(entry) => entry.status.state == JobState::Cancelled,
        None => true,
    }
}

/// Mark a job failed (pre-spawn errors: bad args, ffmpeg sidecar missing) and
/// emit job-done so the UI settles. The reader handles failures *after* spawn.
async fn fail_job(app: &AppHandle, jobs: &JobsMap, job_id: &str, output_path: &str, error: String) {
    {
        let mut jobs = jobs.lock().await;
        if let Some(entry) = jobs.get_mut(job_id) {
            entry.status.state = JobState::Failed;
            entry.status.error = Some(error.clone());
        }
    }
    emit_done(app, job_id, false, false, output_path, &Some(error));
}

fn emit_done(
    app: &AppHandle,
    job_id: &str,
    success: bool,
    cancelled: bool,
    output_path: &str,
    error: &Option<String>,
) {
    let _ = app.emit(
        "job-done",
        serde_json::json!({
            "jobId": job_id,
            "success": success && !cancelled,
            "cancelled": cancelled,
            "outputPath": output_path,
            "error": error,
        }),
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
