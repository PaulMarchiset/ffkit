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
