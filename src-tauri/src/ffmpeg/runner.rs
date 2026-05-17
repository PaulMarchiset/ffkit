use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

/// Return the duration in milliseconds via ffprobe, or None on failure.
pub async fn get_duration_ms(app: &AppHandle, path: &str) -> Option<i64> {
    let cmd = app
        .shell()
        .sidecar("ffprobe")
        .ok()?
        .args(["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]);

    let out = cmd.output().await.ok()?;
    let s = String::from_utf8_lossy(&out.stdout);
    let secs: f64 = s.trim().parse().ok()?;
    Some((secs * 1000.0) as i64)
}
