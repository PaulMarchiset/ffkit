use std::collections::HashMap;
use std::sync::{Arc, Mutex as StdMutex};
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
    /// Whether the home greeting cycles its action word with the typewriter
    /// animation; when false the UI shows a static "ffmpeg". `serde(default)`
    /// keeps older settings.json files (written before this field existed)
    /// loadable instead of falling back to all defaults.
    #[serde(default = "default_true")]
    pub animate_greeting: bool,
}

fn default_true() -> bool {
    true
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
            animate_greeting: true,
        }
    }
}

pub type JobsMap = Arc<Mutex<HashMap<String, JobEntry>>>;

/// Admission control for concurrent ffmpeg jobs.
///
/// Owns the running-job count + configured limit as a single critical section
/// so the check-and-reserve is atomic. Uses `std::sync::Mutex` (not tokio's) so
/// `JobSlot::drop` can release the slot without an async context.
pub struct JobScheduler {
    inner: StdMutex<SchedulerState>,
}

struct SchedulerState {
    running: usize,
    limit: usize,
}

impl JobScheduler {
    pub fn new(limit: usize) -> Self {
        JobScheduler {
            inner: StdMutex::new(SchedulerState { running: 0, limit }),
        }
    }

    /// Atomically reserve a slot if one is available. On `Err`, returns the
    /// current limit so the caller can build a user-facing message.
    pub fn try_reserve(self: &Arc<Self>) -> Result<JobSlot, usize> {
        let mut s = self.inner.lock().unwrap();
        if s.running >= s.limit {
            return Err(s.limit);
        }
        s.running += 1;
        Ok(JobSlot { scheduler: self.clone() })
    }

    pub fn set_limit(&self, n: usize) {
        self.inner.lock().unwrap().limit = n;
    }
}

/// RAII permit. Dropping releases the reserved slot.
pub struct JobSlot {
    scheduler: Arc<JobScheduler>,
}

impl Drop for JobSlot {
    fn drop(&mut self) {
        let mut s = self.scheduler.inner.lock().unwrap();
        s.running = s.running.saturating_sub(1);
    }
}

pub struct AppState {
    pub jobs: JobsMap,
    pub encoder_list: Arc<Mutex<Option<crate::ffmpeg::encoders::EncoderList>>>,
    pub settings: Arc<Mutex<Settings>>,
    pub scheduler: Arc<JobScheduler>,
}

impl AppState {
    pub fn new() -> Self {
        let defaults = Settings::default();
        let limit = defaults.concurrent_jobs as usize;
        AppState {
            jobs: Arc::new(Mutex::new(HashMap::new())),
            encoder_list: Arc::new(Mutex::new(None)),
            settings: Arc::new(Mutex::new(defaults)),
            scheduler: Arc::new(JobScheduler::new(limit)),
        }
    }
}
