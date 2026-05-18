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
    // Two-layer race defense for the Tauri `listen()` lifecycle: the listener
    // is registered synchronously by the IPC layer, but the unlisten fn is
    // only returned via Promise. (1) `cancelled` blocks setState if a late
    // event fires between unmount and unlisten resolving. (2) Any unlisten
    // that resolves after cleanup is invoked immediately so a registration
    // can never outlive the effect.
    let cancelled = false;
    const unlistens: Array<() => void> = [];

    const track = (p: Promise<() => void>) => {
      p.then((u) => {
        if (cancelled) u();
        else unlistens.push(u);
      });
    };

    track(
      onJobProgress((e: JobProgressEvent) => {
        if (cancelled || e.jobId !== jobId) return;
        setProgress({
          percentage: e.percentage,
          speed: e.speed,
          etaSecs: e.etaSecs,
          totalSize: e.totalSize,
          fps: e.fps,
        });
      }),
    );
    track(
      onJobDone((e: JobDoneEvent) => {
        if (cancelled || e.jobId !== jobId) return;
        setDone(e);
      }),
    );
    track(
      onJobLog((e) => {
        if (cancelled || e.jobId !== jobId) return;
        setLogLines((prev) => [...prev.slice(-(LOG_BUFFER_SIZE - 1)), e.line]);
      }),
    );

    return () => {
      cancelled = true;
      for (const u of unlistens) u();
    };
  }, [jobId]);

  return { progress, done, logLines };
}
