use crate::ffmpeg::encoders::{detect_hw_encoders, EncoderList};
use crate::state::AppState;
use tauri::AppHandle;

#[tauri::command]
pub async fn detect_encoders(
    state: tauri::State<'_, AppState>,
    app: AppHandle,
) -> Result<EncoderList, String> {
    let cached = state.encoder_list.lock().await.clone();
    if let Some(list) = cached {
        return Ok(list);
    }

    let list = detect_hw_encoders(&app).await;
    *state.encoder_list.lock().await = Some(list.clone());
    Ok(list)
}
