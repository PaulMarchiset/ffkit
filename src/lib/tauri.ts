import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";

// ── Types ──────────────────────────────────────────────────────────────────

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  videoCodec?: string;
  audioCodec?: string;
  bitrate?: number;
  container?: string;
}

export type Quality = "low" | "medium" | "lossless";
export type JobMode = "preset" | "raw";
export type HardwareAccel = "auto" | "software";
export type UpdateChannel = "stable" | "beta";

export interface JobSpec {
  inputPath: string;
  outputPath: string;
  mode: JobMode;
  quality?: Quality;
  rawArgs?: string[];
}

export interface JobStatus {
  id: string;
  inputPath: string;
  outputPath: string;
  state: "queued" | "running" | "done" | "cancelled" | "failed";
  progress: number;
  speed: number;
  etaSecs: number;
  outputSize: number;
  error?: string;
}

export interface HwEncoder {
  name: string;
  codec: string;
  probed: boolean;
  warning?: string;
}

export interface GpuPresence {
  nvidia: boolean;
  intel: boolean;
  amd: boolean;
  names: string[];
}

export interface EncoderList {
  available: HwEncoder[];
  bestH264?: string;
  bestH265?: string;
  gpus: GpuPresence;
  warnings: string[];
}

export interface Settings {
  outputFolder?: string;
  outputNaming: string;
  defaultQuality: Quality;
  hardwareAccel: HardwareAccel;
  updateChannel: UpdateChannel;
  concurrentJobs: number;
  notifyOnDone: boolean;
  openFolderOnDone: boolean;
}

export interface JobProgressEvent {
  jobId: string;
  frame: number;
  fps: number;
  speed: number;
  outTimeMs: number;
  totalSize: number;
  percentage: number;
  etaSecs: number;
  done: boolean;
}

export interface JobDoneEvent {
  jobId: string;
  success: boolean;
  cancelled: boolean;
  outputPath: string;
  error?: string;
}

export interface JobLogEvent {
  jobId: string;
  line: string;
}

// ── Commands ───────────────────────────────────────────────────────────────

export const probeFile = (path: string) =>
  invoke<FileInfo>("probe_file", { path });

export const detectEncoders = () => invoke<EncoderList>("detect_encoders");

export const startJob = (spec: JobSpec) =>
  invoke<string>("start_job", { spec });

export const cancelJob = (id: string) => invoke<void>("cancel_job", { id });

export const clearJob = (id: string) => invoke<void>("clear_job", { id });

export const listJobs = () => invoke<JobStatus[]>("list_jobs");

export const getSettings = () => invoke<Settings>("get_settings");

export const setSettings = (settings: Settings) =>
  invoke<void>("set_settings", { settings });

export const openPath = (path: string) => invoke<void>("open_path", { path });

export const openUrl = (url: string) => invoke<void>("open_url", { url });

// ── Event listeners ────────────────────────────────────────────────────────

export const onJobProgress = (cb: (e: JobProgressEvent) => void) =>
  listen<JobProgressEvent>("job-progress", (e) => cb(e.payload));

export const onJobDone = (cb: (e: JobDoneEvent) => void) =>
  listen<JobDoneEvent>("job-done", (e) => cb(e.payload));

export const onJobLog = (cb: (e: JobLogEvent) => void) =>
  listen<JobLogEvent>("job-log", (e) => cb(e.payload));

// ── Native file dialogs ───────────────────────────────────────────────────

const VIDEO_FILTERS = [
  {
    name: "Video",
    extensions: ["mp4", "mkv", "mov", "avi", "webm", "flv", "m4v", "wmv", "ts"],
  },
];

export async function pickVideoFile(): Promise<string | null> {
  const result = await open({ filters: VIDEO_FILTERS, multiple: false });
  return typeof result === "string" ? result : null;
}

export async function pickOutputFile(defaultPath?: string): Promise<string | null> {
  const result = await save({
    defaultPath,
    filters: [{ name: "MP4 Video", extensions: ["mp4"] }],
  });
  return result ?? null;
}

export async function pickOutputFolder(): Promise<string | null> {
  const result = await open({ directory: true, multiple: false });
  if (typeof result === "string") return result;
  return null;
}
