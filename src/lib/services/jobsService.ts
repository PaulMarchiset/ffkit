import {
  cancelJob,
  clearJob,
  detectEncoders,
  listJobs,
  onJobDone,
  onJobLog,
  onJobProgress,
  startJob,
  startJobs,
} from "@/lib/tauri";
import type {
  EncoderList,
  JobDoneEvent,
  JobLogEvent,
  JobProgressEvent,
  JobSpec,
  JobStatus,
} from "@/lib/types";

/**
 * The IPC seam for everything job-related: starting/cancelling/clearing jobs,
 * listing them, probing encoder support, and subscribing to live job events.
 * Components and hooks go through this service so the actual Tauri calls live
 * in exactly one place (see also {@link settingsService}, {@link filesService}).
 */
export const jobsService = {
  start: (spec: JobSpec): Promise<string> => startJob(spec),
  startBatch: (specs: JobSpec[]): Promise<string[]> => startJobs(specs),
  cancel: (id: string): Promise<void> => cancelJob(id),
  clear: (id: string): Promise<void> => clearJob(id),
  list: (): Promise<JobStatus[]> => listJobs(),
  detectEncoders: (): Promise<EncoderList> => detectEncoders(),

  onProgress: (cb: (e: JobProgressEvent) => void): Promise<() => void> =>
    onJobProgress(cb),
  onDone: (cb: (e: JobDoneEvent) => void): Promise<() => void> => onJobDone(cb),
  onLog: (cb: (e: JobLogEvent) => void): Promise<() => void> => onJobLog(cb),
};
