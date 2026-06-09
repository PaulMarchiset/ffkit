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
  /** Raw-mode command template ({input}/{output} placeholders); the backend
   *  substitutes and tokenizes it. */
  rawTemplate?: string;
  /** Duration in ms from the load-time probe; lets the backend skip re-probing. */
  totalDurationMs?: number;
}

/**
 * Lightweight input-file metadata forwarded from the converter to the progress
 * view, so the result card can show the size reduction ("SAVED") and clip
 * length ("TIME") without re-probing the file.
 */
export interface JobInputMeta {
  size?: number;
  durationMs?: number;
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

/**
 * The job status as the progress view models it: "running" until the job
 * finishes, then one of the terminal outcomes. Distinct from the backend-shaped
 * {@link JobStatus} (whose `state` includes "queued"/"done").
 */
export type JobViewStatus = "running" | "success" | "cancelled" | "failed";

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
  /** Cycle the home greeting's action word with the typewriter animation;
   *  when false the greeting shows a static "ffmpeg". */
  animateGreeting: boolean;
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
