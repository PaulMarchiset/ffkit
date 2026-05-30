import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { jobsService } from "@/lib/services/jobsService";
import { useTauriListener } from "@/lib/useTauriListener";
import type {
  JobProgressEvent,
  JobDoneEvent,
  JobLogEvent,
  JobStatus,
} from "@/lib/types";

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

export interface JobProgressState {
  percentage: number;
  speed: number;
  etaSecs: number;
  totalSize: number;
  fps: number;
}

export interface JobEvents {
  progress: JobProgressState;
  done: JobDoneEvent | null;
  logLines: string[];
}

const AUTO_CLEAR_MS = 3000;
const LOG_BUFFER_SIZE = 500;

const INITIAL_PROGRESS: JobProgressState = {
  percentage: 0,
  speed: 0,
  etaSecs: 0,
  totalSize: 0,
  fps: 0,
};

// Stable empty reference so a job with no logs doesn't churn referential equality.
const EMPTY_LOGS: string[] = [];

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

interface JobsContextValue {
  /** Every tracked job, keyed by id. */
  jobsById: Record<string, DockJob>;
  /** Per-job done events; retained after auto-clear so the progress view survives. */
  doneById: Record<string, JobDoneEvent>;
  /** Per-job log buffers (capped at LOG_BUFFER_SIZE lines). */
  logsById: Record<string, string[]>;
  /** Remove a job (and its logs/done event) from the UI and ask the backend to purge it. */
  dismiss: (id: string) => void;
}

const JobsContext = createContext<JobsContextValue | null>(null);

/**
 * Owns the single, app-wide subscription to job-progress / job-done / job-log
 * events. Seeds from list_jobs() on mount, then keeps state live. Successful and
 * cancelled jobs are auto-removed from the list after 3s; failed jobs stick
 * until dismissed. Consumers read derived slices via {@link useJobsList} (the
 * dock list) and {@link useJobEvents} (a single active job) — neither subscribes
 * to events itself.
 */
export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Record<string, DockJob>>({});
  const [doneById, setDoneById] = useState<Record<string, JobDoneEvent>>({});
  const [logsById, setLogsById] = useState<Record<string, string[]>>({});
  const clearTimers = useRef<Record<string, number>>({});
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const refresh = useCallback(async () => {
    try {
      const list = await jobsService.list();
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
    setDoneById((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setLogsById((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    jobsService.clear(id).catch(() => {
      // Backend may already have purged it, or job is still active — safe to ignore.
    });
  }, []);

  // Drops a finished job from the dock list after a grace period, but keeps its
  // done event and logs so a mounted progress view doesn't revert to "running".
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
      jobsService.clear(id).catch(() => {
        // See dismiss().
      });
    }, AUTO_CLEAR_MS);
  }, []);

  // Seed from list_jobs() on mount; tear down any pending auto-clear timers on
  // unmount. The live event subscriptions are owned by the useTauriListener
  // calls below.
  useEffect(() => {
    refresh();
    const timers = clearTimers.current;
    return () => {
      for (const tid of Object.values(timers)) clearTimeout(tid);
      clearTimers.current = {};
    };
  }, [refresh]);

  useTauriListener<JobProgressEvent>(
    (cb) => jobsService.onProgress(cb),
    (e) => {
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
    },
  );

  useTauriListener<JobDoneEvent>(
    (cb) => jobsService.onDone(cb),
    (e) => {
      setDoneById((prev) => ({ ...prev, [e.jobId]: e }));
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
    },
  );

  useTauriListener<JobLogEvent>(
    (cb) => jobsService.onLog(cb),
    (e) => {
      setLogsById((prev) => {
        const current = prev[e.jobId] ?? EMPTY_LOGS;
        return {
          ...prev,
          [e.jobId]: [...current.slice(-(LOG_BUFFER_SIZE - 1)), e.line],
        };
      });
    },
  );

  const value = useMemo<JobsContextValue>(
    () => ({ jobsById: jobs, doneById, logsById, dismiss }),
    [jobs, doneById, logsById, dismiss],
  );

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

function useJobs(): JobsContextValue {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be used within a JobsProvider");
  return ctx;
}

/**
 * Derived selector: the full list of tracked jobs plus the dismiss action.
 * Drives the jobs dock.
 */
export function useJobsList(): { jobs: DockJob[]; dismiss: (id: string) => void } {
  const { jobsById, dismiss } = useJobs();
  const jobs = useMemo(() => Object.values(jobsById), [jobsById]);
  return { jobs, dismiss };
}

/**
 * Derived selector: the live progress, done event, and log lines for a single
 * job. Reads straight from the shared store — no per-component subscription.
 */
export function useJobEvents(jobId: string): JobEvents {
  const { jobsById, doneById, logsById } = useJobs();
  const job = jobsById[jobId];
  const progress = useMemo<JobProgressState>(
    () =>
      job
        ? {
            percentage: job.progress,
            speed: job.speed,
            etaSecs: job.etaSecs,
            totalSize: job.totalSize,
            fps: job.fps,
          }
        : INITIAL_PROGRESS,
    [job],
  );
  return {
    progress,
    done: doneById[jobId] ?? null,
    logLines: logsById[jobId] ?? EMPTY_LOGS,
  };
}
