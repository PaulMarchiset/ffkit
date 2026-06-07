pub mod commands;
pub mod ffmpeg;
pub mod state;

use commands::{encoders, jobs, probe, settings, system};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(state::AppState::new())
        .setup(|app| {
            // Load persisted settings into state once, at startup, so the
            // get_settings command stays a pure read (no disk IO / mutation).
            let state = app.state::<state::AppState>();
            settings::load_persisted_settings(app.handle(), state.inner());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            probe::probe_file,
            encoders::detect_encoders,
            jobs::start_job,
            jobs::cancel_job,
            jobs::list_jobs,
            jobs::clear_job,
            settings::get_settings,
            settings::set_settings,
            system::open_path,
            system::open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
