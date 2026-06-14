use std::collections::HashMap;
use std::sync::{Arc, Mutex as StdMutex};
use tokio::sync::{Mutex, Notify};
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
    /// "system" | "light" | "dark". `serde(default)` keeps older settings.json
    /// files (written before this field) loadable.
    #[serde(default = "default_theme")]
    pub theme: String,
    /// "system" | "en" | "fr". `serde(default)` keeps older settings.json files
    /// (written before this field) loadable.
    #[serde(default = "default_language")]
    pub language: String,
}

fn default_true() -> bool {
    true
}

fn default_theme() -> String {
    "dark".to_string()
}

fn default_language() -> String {
    "system".to_string()
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            output_folder: None,
            output_naming: "{name}_ffkit".to_string(),
            default_quality: "medium".to_string(),
            hardware_accel: "auto".to_string(),
            update_channel: "stable".to_string(),
            concurrent_jobs: 2,
            notify_on_done: true,
            open_folder_on_done: false,
            animate_greeting: true,
            theme: "dark".to_string(),
            language: "system".to_string(),
        }
    }
}

pub type JobsMap = Arc<Mutex<HashMap<String, JobEntry>>>;

/// Admission control for concurrent ffmpeg jobs.
///
/// Owns the running-job count + configured limit as a single critical section.
/// Acquisition is async and *queues*: a job past the limit awaits here (sitting
/// in `JobState::Queued`) until a slot frees, rather than being rejected. Uses
/// `std::sync::Mutex` (not tokio's) so `JobSlot::drop` can release the slot
/// without an async context; a `Notify` wakes queued acquirers.
pub struct JobScheduler {
    inner: StdMutex<SchedulerState>,
    /// Pulsed whenever a slot frees or the limit grows, so queued `acquire`
    /// futures re-check the condition.
    available: Notify,
}

struct SchedulerState {
    running: usize,
    limit: usize,
}

impl JobScheduler {
    pub fn new(limit: usize) -> Self {
        JobScheduler {
            inner: StdMutex::new(SchedulerState { running: 0, limit }),
            available: Notify::new(),
        }
    }

    /// Await an admission slot, queuing until `running < limit`. The returned
    /// `JobSlot` releases the slot when dropped (after the job's reader returns).
    ///
    /// Lost-wakeup-safe: the `Notified` future is registered (`enable`) *before*
    /// each condition check, so a slot freed between check and await still wakes
    /// us. `notify_waiters` (used by the producers) only wakes already-registered
    /// waiters, which is exactly why the pre-registration matters.
    pub async fn acquire(self: &Arc<Self>) -> JobSlot {
        let notified = self.available.notified();
        tokio::pin!(notified);
        loop {
            notified.as_mut().enable();
            {
                let mut s = self.inner.lock().unwrap();
                if s.running < s.limit {
                    s.running += 1;
                    return JobSlot { scheduler: self.clone() };
                }
            }
            notified.as_mut().await;
            notified.set(self.available.notified());
        }
    }

    /// Update the live concurrency limit (settings change). Waking waiters lets
    /// newly-permitted jobs start when the limit grows; a shrink simply means
    /// already-running jobs finish before the surplus queue drains.
    pub fn set_limit(&self, n: usize) {
        self.inner.lock().unwrap().limit = n;
        self.available.notify_waiters();
    }
}

/// RAII permit. Dropping releases the reserved slot and wakes a queued acquirer.
pub struct JobSlot {
    scheduler: Arc<JobScheduler>,
}

impl Drop for JobSlot {
    fn drop(&mut self) {
        {
            let mut s = self.scheduler.inner.lock().unwrap();
            s.running = s.running.saturating_sub(1);
        }
        self.scheduler.available.notify_waiters();
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
