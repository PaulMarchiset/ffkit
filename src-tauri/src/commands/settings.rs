use crate::state::{AppState, Settings};
use tauri::{AppHandle, Manager};

fn settings_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("settings.json"))
}

#[tauri::command]
pub async fn get_settings(
    state: tauri::State<'_, AppState>,
    app: AppHandle,
) -> Result<Settings, String> {
    let path = settings_path(&app)?;
    if path.exists() {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        if let Ok(loaded) = serde_json::from_str::<Settings>(&content) {
            state.scheduler.set_limit(loaded.concurrent_jobs as usize);
            *state.settings.lock().await = loaded;
        }
    }
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
