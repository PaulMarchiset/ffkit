pub mod commands;
pub mod ffmpeg;
pub mod state;

use commands::{jobs, probe, encoders, settings, open_path, open_url};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(state::AppState::new())
        .invoke_handler(tauri::generate_handler![
            probe::probe_file,
            encoders::detect_encoders,
            jobs::start_job,
            jobs::cancel_job,
            jobs::list_jobs,
            settings::get_settings,
            settings::set_settings,
            open_path,
            open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
