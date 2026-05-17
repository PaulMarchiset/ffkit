import { useEffect, useRef, useState } from "react";
import { X, ChevronDown, ChevronUp, FolderOpen, RotateCcw } from "lucide-react";
import { cn, formatBytes, formatEta } from "@/lib/utils";
import {
  onJobProgress,
  onJobDone,
  onJobLog,
  cancelJob,
  openPath,
  type JobProgressEvent,
  type JobDoneEvent,
} from "@/lib/tauri";
import * as Progress from "@radix-ui/react-progress";
import * as ScrollArea from "@radix-ui/react-scroll-area";

interface Props {
  jobId: string;
  outputPath: string;
  onBack: () => void;
}

interface ProgressState {
  percentage: number;
  speed: number;
  etaSecs: number;
  totalSize: number;
  fps: number;
}

export function JobProgress({ jobId, outputPath, onBack }: Props) {
  const [progress, setProgress] = useState<ProgressState>({
    percentage: 0,
    speed: 0,
    etaSecs: 0,
    totalSize: 0,
    fps: 0,
  });
  const [done, setDone] = useState<JobDoneEvent | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

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
        setLogLines((prev) => [...prev.slice(-499), e.line]);
      }),
    ];

    return () => {
      Promise.all(unlistens).then((fns) => fns.forEach((f) => f()));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (logOpen) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logLines, logOpen]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelJob(jobId);
    } finally {
      setCancelling(false);
    }
  }

  const isDone = done !== null;
  const isSuccess = done?.success === true;
  const isCancelled = done?.cancelled === true;
  const isFailed = isDone && !isSuccess && !isCancelled;

  return (
    <div className="flex flex-col gap-6">
      {/* Status header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isCancelled
              ? "Cancelled"
              : isFailed
              ? "Failed"
              : isSuccess
              ? "Done"
              : "Encoding…"}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {isDone ? "100" : progress.percentage.toFixed(1)}%
          </span>
        </div>

        <Progress.Root
          value={isDone ? 100 : progress.percentage}
          className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
        >
          <Progress.Indicator
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isFailed || isCancelled
                ? "bg-red-500"
                : isSuccess
                ? "bg-green-500"
                : "bg-green-500",
            )}
            style={{ width: `${isDone ? 100 : progress.percentage}%` }}
          />
        </Progress.Root>
      </div>

      {/* Stats row */}
      {!isDone && (
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Stat label="Speed" value={progress.speed > 0 ? `${progress.speed.toFixed(1)}×` : "—"} />
          <Stat label="ETA" value={formatEta(progress.etaSecs)} />
          <Stat label="Size so far" value={formatBytes(progress.totalSize)} />
        </div>
      )}

      {/* Done state */}
      {isDone && (
        <div
          className={cn(
            "rounded-xl border p-4 text-sm",
            isSuccess
              ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 text-green-800 dark:text-green-300"
              : "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 text-red-800 dark:text-red-300",
          )}
        >
          {isSuccess && (
            <>
              <p className="font-medium mb-1">Conversion complete</p>
              <p className="text-xs break-all opacity-75">{outputPath}</p>
            </>
          )}
          {isCancelled && <p className="font-medium">Job was cancelled.</p>}
          {isFailed && (
            <>
              <p className="font-medium mb-1">Encoding failed</p>
              {done?.error && (
                <p className="text-xs font-mono break-all opacity-75">{done.error}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {!isDone && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
        {isSuccess && (
          <button
            onClick={() => openPath(outputPath.split(/(\\|\/)/).slice(0, -1).join(outputPath.includes("\\") ? "\\" : "/"))}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Open folder
          </button>
        )}
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {isDone ? "Convert another" : "Background"}
        </button>
      </div>

      {/* Collapsible log */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setLogOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <span>ffmpeg log</span>
          {logOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {logOpen && (
          <ScrollArea.Root className="h-48 border-t border-gray-200 dark:border-gray-700">
            <ScrollArea.Viewport className="w-full h-full">
              <div className="p-3 font-mono text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                {logLines.map((line, i) => (
                  <div key={i} className="break-all leading-relaxed">
                    {line}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="w-1.5 p-0.5">
              <ScrollArea.Thumb className="bg-gray-300 dark:bg-gray-600 rounded-full" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2.5">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className="font-medium text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}
