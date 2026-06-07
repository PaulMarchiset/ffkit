use crate::state::{AppState, Settings};
use tauri::{AppHandle, Manager};

fn settings_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("settings.json"))
}

/// Load persisted settings from disk into `state` and apply the scheduler
/// limit. Called once at startup (see lib.rs `setup`) so `get_settings` can stay
/// a pure read. A missing/unreadable/invalid file leaves the in-memory defaults
/// untouched. try_lock is safe here: the lock is uncontended at startup, and it
/// avoids needing an async context in the synchronous setup hook.
pub fn load_persisted_settings(app: &AppHandle, state: &AppState) {
    let Ok(path) = settings_path(app) else { return };
    if !path.exists() {
        return;
    }
    let Ok(content) = std::fs::read_to_string(&path) else { return };
    let Ok(loaded) = serde_json::from_str::<Settings>(&content) else { return };
    state.scheduler.set_limit(loaded.concurrent_jobs as usize);
    if let Ok(mut settings) = state.settings.try_lock() {
        *settings = loaded;
    }
}

#[tauri::command]
pub async fn get_settings(state: tauri::State<'_, AppState>) -> Result<Settings, String> {
    Ok(state.settings.lock().await.clone())
}

#[tauri::command]
pub async fn set_settings(
    settings: Settings,
    state: tauri::State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    let path = settings_path(&app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    state.scheduler.set_limit(settings.concurrent_jobs as usize);
    *state.settings.lock().await = settings;
    Ok(())
}
