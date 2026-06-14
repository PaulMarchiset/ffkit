import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  EncoderList,
  FileInfo,
  JobDoneEvent,
  JobLogEvent,
  JobProgressEvent,
  JobSpec,
  JobStatus,
  Settings,
} from "@/lib/types";

// ── Commands ───────────────────────────────────────────────────────────────

export const probeFile = (path: string) =>
  invoke<FileInfo>("probe_file", { path });

export const estimateOutputSize = (
  path: string,
  quality: string,
  totalDurationMs?: number,
) => invoke<number>("estimate_output_size", { path, quality, totalDurationMs });

export const extractWaveform = (path: string, buckets: number) =>
  invoke<number[]>("extract_waveform", { path, buckets });

export const detectEncoders = () => invoke<EncoderList>("detect_encoders");

export const startJob = (spec: JobSpec) =>
  invoke<string>("start_job", { spec });

export const startJobs = (specs: JobSpec[]) =>
  invoke<string[]>("start_jobs", { specs });

export const cancelJob = (id: string) => invoke<void>("cancel_job", { id });

export const clearJob = (id: string) => invoke<void>("clear_job", { id });

export const listJobs = () => invoke<JobStatus[]>("list_jobs");

export const getSettings = () => invoke<Settings>("get_settings");

export const setSettings = (settings: Settings) =>
  invoke<void>("set_settings", { settings });

export const openPath = (path: string) => invoke<void>("open_path", { path });

export const openUrl = (url: string) => invoke<void>("open_url", { url });

// ── Event listeners ────────────────────────────────────────────────────────

function on<T>(event: string, cb: (payload: T) => void) {
  return listen<T>(event, (e) => cb(e.payload));
}

export const onJobProgress = (cb: (e: JobProgressEvent) => void) =>
  on<JobProgressEvent>("job-progress", cb);

export const onJobDone = (cb: (e: JobDoneEvent) => void) =>
  on<JobDoneEvent>("job-done", cb);

export const onJobLog = (cb: (e: JobLogEvent) => void) =>
  on<JobLogEvent>("job-log", cb);
