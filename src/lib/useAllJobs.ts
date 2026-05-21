import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearJob,
  listJobs,
  onJobDone,
  onJobProgress,
  type JobProgressEvent,
  type JobDoneEvent,
  type JobStatus,
} from "@/lib/tauri";

export interface DockJob {
  id: string;
  inputPath: string;
  outputPath: string;
  state: JobStatus["state"];
  progress: number;
  speed: number;
  etaSecs: number;
  fps: number;
  totalSize: number;
  error?: string;
}

const AUTO_CLEAR_MS = 3000;

function fromStatus(s: JobStatus): DockJob {
  return {
    id: s.id,
    inputPath: s.inputPath,
    outputPath: s.outputPath,
    state: s.state,
    progress: s.progress,
    speed: s.speed,
    etaSecs: s.etaSecs,
    fps: 0,
    totalSize: s.outputSize,
    error: s.error,
  };
}

/**
 * Tracks every job the backend knows about. Seeds from list_jobs() on mount,
 * then keeps state live via job-progress / job-done events. Successful and
 * cancelled jobs are auto-removed after 3s; failed jobs stick until dismissed.
 */
export function useAllJobs() {
  const [jobs, setJobs] = useState<Record<string, DockJob>>({});
  const clearTimers = useRef<Record<string, number>>({});
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const refresh = useCallback(async () => {
    try {
      const list = await listJobs();
      setJobs((prev) => {
        const next = { ...prev };
        for (const s of list) {
          if (!next[s.id]) next[s.id] = fromStatus(s);
        }
        return next;
      });
    } catch {
      // listJobs can fail before backend is ready; ignore.
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    const tid = clearTimers.current[id];
    if (tid !== undefined) {
      clearTimeout(tid);
      delete clearTimers.current[id];
    }
    setJobs((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    clearJob(id).catch(() => {
      // Backend may already have purged it, or job is still active — safe to ignore.
    });
  }, []);

  const scheduleClear = useCallback((id: string) => {
    if (clearTimers.current[id] !== undefined) return;
    clearTimers.current[id] = window.setTimeout(() => {
      delete clearTimers.current[id];
      setJobs((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      clearJob(id).catch(() => {
        // See dismiss().
      });
    }, AUTO_CLEAR_MS);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unlistens: Array<() => void> = [];
    const track = (p: Promise<() => void>) => {
      p.then((u) => {
        if (cancelled) u();
        else unlistens.push(u);
      });
    };

    refresh();

    track(
      onJobProgress((e: JobProgressEvent) => {
        if (cancelled) return;
        if (!jobsRef.current[e.jobId]) {
          // New job we haven't seen — pull its metadata from the backend.
          refresh();
          return;
        }
        setJobs((prev) => {
          const current = prev[e.jobId];
          if (!current) return prev;
          return {
            ...prev,
            [e.jobId]: {
              ...current,
              state: "running",
              progress: e.percentage,
              speed: e.speed,
              etaSecs: e.etaSecs,
              fps: e.fps,
              totalSize: e.totalSize,
            },
          };
        });
      }),
    );

    track(
      onJobDone((e: JobDoneEvent) => {
        if (cancelled) return;
        setJobs((prev) => {
          const current = prev[e.jobId];
          if (!current) return prev;
          const finalState: JobStatus["state"] = e.cancelled
            ? "cancelled"
            : e.success
              ? "done"
              : "failed";
          return {
            ...prev,
            [e.jobId]: {
              ...current,
              state: finalState,
              progress: e.success ? 100 : current.progress,
              etaSecs: 0,
              error: e.error,
            },
          };
        });
        if (e.success || e.cancelled) scheduleClear(e.jobId);
      }),
    );

    return () => {
      cancelled = true;
      for (const u of unlistens) u();
      for (const tid of Object.values(clearTimers.current)) clearTimeout(tid);
      clearTimers.current = {};
    };
  }, [refresh, scheduleClear]);

  return {
    jobs: Object.values(jobs),
    dismiss,
  };
}
