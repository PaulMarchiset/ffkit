use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum JobState {
    Queued,
    Running,
    Done,
    Cancelled,
    Failed,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct JobStatus {
    pub id: String,
    pub input_path: String,
    pub output_path: String,
    pub state: JobState,
    pub progress: f64,
    pub speed: f64,
    pub eta_secs: f64,
    pub output_size: u64,
    pub error: Option<String>,
}

pub struct JobEntry {
    pub status: JobStatus,
    pub child: Option<tauri_plugin_shell::process::CommandChild>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub output_folder: Option<String>,
    pub output_naming: String,
    pub default_quality: String,
    /// "auto" | "software" | specific encoder name
    pub hardware_accel: String,
    pub update_channel: String,
    pub concurrent_jobs: u32,
    pub notify_on_done: bool,
    pub open_folder_on_done: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            output_folder: None,
            output_naming: "{name}_ffkit".to_string(),
            default_quality: "medium".to_string(),
            hardware_accel: "auto".to_string(),
            update_channel: "stable".to_string(),
            concurrent_jobs: 1,
            notify_on_done: true,
            open_folder_on_done: false,
        }
    }
}

pub type JobsMap = Arc<Mutex<HashMap<String, JobEntry>>>;

pub struct AppState {
    pub jobs: JobsMap,
    pub encoder_list: Arc<Mutex<Option<crate::ffmpeg::encoders::EncoderList>>>,
    pub settings: Arc<Mutex<Settings>>,
}

impl AppState {
    pub fn new() -> Self {
        AppState {
            jobs: Arc::new(Mutex::new(HashMap::new())),
            encoder_list: Arc::new(Mutex::new(None)),
            settings: Arc::new(Mutex::new(Settings::default())),
        }
    }
}
