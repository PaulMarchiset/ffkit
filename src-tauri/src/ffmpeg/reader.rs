use crate::ffmpeg::progress::{ProgressAccumulator, ProgressUpdate};
use crate::state::{JobState, JobsMap};
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::CommandEvent;

/// Derived per-tick figures the UI cares about.
#[derive(Clone, Copy, Debug)]
struct ProgressSnapshot {
    percentage: f64,
    eta_secs: f64,
}

fn compute_snapshot(update: &ProgressUpdate, total_ms: Option<i64>) -> ProgressSnapshot {
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

    ProgressSnapshot { percentage, eta_secs }
}

async fn apply_progress(
    jobs: &JobsMap,
    job_id: &str,
    update: &ProgressUpdate,
    snapshot: ProgressSnapshot,
) {
    let mut jobs = jobs.lock().await;
    if let Some(entry) = jobs.get_mut(job_id) {
        entry.status.progress = snapshot.percentage;
        entry.status.speed = update.speed;
        entry.status.eta_secs = snapshot.eta_secs;
        entry.status.output_size = update.total_size;
    }
}

fn emit_progress(
    app: &AppHandle,
    job_id: &str,
    update: &ProgressUpdate,
    snapshot: ProgressSnapshot,
) {
    let _ = app.emit(
        "job-progress",
        serde_json::json!({
            "jobId": job_id,
            "frame": update.frame,
            "fps": update.fps,
            "speed": update.speed,
            "outTimeMs": update.out_time_ms,
            "totalSize": update.total_size,
            "percentage": snapshot.percentage,
            "etaSecs": snapshot.eta_secs,
            "done": update.done,
        }),
    );
}

fn emit_log(app: &AppHandle, job_id: &str, line: &str) {
    let _ = app.emit(
        "job-log",
        serde_json::json!({ "jobId": job_id, "line": line }),
    );
}

async fn was_cancelled(jobs: &JobsMap, job_id: &str) -> bool {
    let jobs = jobs.lock().await;
    jobs.get(job_id)
        .map(|e| e.status.state == JobState::Cancelled)
        .unwrap_or(false)
}

/// Apply the terminal status and emit job-done. Returns the cloned outputPath
/// + error so the caller doesn't have to re-lock to read them for the event.
async fn finalize(
    jobs: &JobsMap,
    job_id: &str,
    success: bool,
    cancelled: bool,
    last_stderr: Option<String>,
) -> Option<(String, Option<String>)> {
    let mut jobs = jobs.lock().await;
    let entry = jobs.get_mut(job_id)?;

    if !cancelled {
        if success {
            entry.status.state = JobState::Done;
            entry.status.progress = 100.0;
        } else {
            entry.status.state = JobState::Failed;
            entry.status.error = last_stderr;
        }
    }
    entry.child = None;
    Some((entry.status.output_path.clone(), entry.status.error.clone()))
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

/// Drive an ffmpeg sidecar to completion: parse stdout progress, forward
/// stderr as log events, and emit the terminal job-done event.
pub async fn run_job_reader(
    mut rx: tokio::sync::mpsc::Receiver<CommandEvent>,
    job_id: String,
    jobs: JobsMap,
    app: AppHandle,
    total_ms: Option<i64>,
) {
    let mut acc = ProgressAccumulator::new();
    let mut last_stderr: Option<String> = None;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                for update in acc.feed(&bytes) {
                    let snapshot = compute_snapshot(&update, total_ms);
                    apply_progress(&jobs, &job_id, &update, snapshot).await;
                    emit_progress(&app, &job_id, &update, snapshot);
                }
            }
            CommandEvent::Stderr(bytes) => {
                let line = String::from_utf8_lossy(&bytes).to_string();
                last_stderr = Some(line.clone());
                emit_log(&app, &job_id, &line);
            }
            CommandEvent::Terminated(status) => {
                let success = status.code.map(|c| c == 0).unwrap_or(false);
                let cancelled = was_cancelled(&jobs, &job_id).await;
                if let Some((output_path, error)) =
                    finalize(&jobs, &job_id, success, cancelled, last_stderr.clone()).await
                {
                    emit_done(&app, &job_id, success, cancelled, &output_path, &error);
                }
                break;
            }
            _ => {}
        }
    }
}
