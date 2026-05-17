import { useEffect, useState } from "react";
import {
  onJobProgress,
  onJobDone,
  onJobLog,
  type JobProgressEvent,
  type JobDoneEvent,
} from "@/lib/tauri";

export interface JobProgressState {
  percentage: number;
  speed: number;
  etaSecs: number;
  totalSize: number;
  fps: number;
}

const INITIAL_PROGRESS: JobProgressState = {
  percentage: 0,
  speed: 0,
  etaSecs: 0,
  totalSize: 0,
  fps: 0,
};

const LOG_BUFFER_SIZE = 500;

export interface JobEvents {
  progress: JobProgressState;
  done: JobDoneEvent | null;
  logLines: string[];
}

/**
 * Subscribes to job-progress, job-done, and job-log events for a given jobId.
 * Returns the accumulated state. Events for other jobIds are ignored. All
 * subscriptions are cleaned up on unmount or jobId change.
 */
export function useJobEvents(jobId: string): JobEvents {
  const [progress, setProgress] = useState<JobProgressState>(INITIAL_PROGRESS);
  const [done, setDone] = useState<JobDoneEvent | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);

  useEffect(() => {
    const unlistens = [
      onJobProgress((e: JobProgressEvent) => {
        if (e.jobId !== jobId) return;
        setProgress({
          percentage: e.percentage,
          speed: e.speed,
          etaSecs: e.etaSecs,
          totalSize: e.totalSize,
          fps: e.fps,
        });
      }),
      onJobDone((e: JobDoneEvent) => {
        if (e.jobId !== jobId) return;
        setDone(e);
      }),
      onJobLog((e) => {
        if (e.jobId !== jobId) return;
        setLogLines((prev) => [...prev.slice(-(LOG_BUFFER_SIZE - 1)), e.line]);
      }),
    ];

    return () => {
      Promise.all(unlistens).then((fns) => fns.forEach((f) => f()));
    };
  }, [jobId]);

  return { progress, done, logLines };
}
