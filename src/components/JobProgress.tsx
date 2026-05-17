import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, FolderOpen, RotateCcw, X, Zap } from "lucide-react";
import { formatBytes, formatEta, parentDir } from "@/lib/utils";
import { cancelJob, openPath } from "@/lib/tauri";
import { useTypewriter } from "@/lib/useTypewriter";
import { useJobEvents } from "@/lib/useJobEvents";
import { getPhasePool } from "@/lib/jobPhaseWords";
import * as ScrollArea from "@radix-ui/react-scroll-area";

interface Props {
  jobId: string;
  outputPath: string;
  onBack: () => void;
}

export function JobProgress({ jobId, outputPath, onBack }: Props) {
  const { progress, done, logLines } = useJobEvents(jobId);
  const [logOpen, setLogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const progressRef = useRef(0);
  useEffect(() => {
    progressRef.current = progress.percentage;
  }, [progress.percentage]);

  const displayedWord = useTypewriter(
    "Probing",
    () => {
      const pool = getPhasePool(progressRef.current);
      return pool[Math.floor(Math.random() * pool.length)];
    },
    { enabled: !done },
  );

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
    <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto w-full py-8">
      {/* Status word */}
      {!isDone ? (
        <div className="flex items-center gap-2 justify-center">
          <Zap />
          <p className="font-serif text-2xl text-accent leading-tight">
            {displayedWord}...
          </p>
        </div>
      ) : (
        <p className="font-serif text-2xl text-[#E8E5DC] leading-tight">
          {isSuccess ? "Done." : isCancelled ? "Cancelled." : "Failed."}
        </p>
      )}

      {/* Live stats */}
      {!isDone && (
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>{progress.percentage.toFixed(1)}%</span>
          {progress.etaSecs > 0 && (
            <>
              <span className="opacity-20">·</span>
              <span>{formatEta(progress.etaSecs)} left</span>
            </>
          )}
          {progress.fps > 0 && (
            <>
              <span className="opacity-20">·</span>
              <span>{Math.round(progress.fps)} fps</span>
            </>
          )}
          {progress.totalSize > 0 && (
            <>
              <span className="opacity-20">·</span>
              <span>{formatBytes(progress.totalSize)}</span>
            </>
          )}
        </div>
      )}

      {/* Success path */}
      {isSuccess && (
        <p className="text-sm text-muted text-center max-w-sm break-all px-2">{outputPath}</p>
      )}

      {/* Error detail */}
      {isFailed && done?.error && (
        <p className="text-sm text-red-400 font-mono text-center max-w-sm break-all px-2">{done.error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!isDone && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 text-sm text-muted hover:text-[#E8E5DC] hover:border-white/25 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
        {isSuccess && (
          <button
            onClick={() => openPath(parentDir(outputPath))}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-accent/50 text-sm text-accent bg-accent/10 hover:bg-accent/15 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Open folder
          </button>
        )}
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 text-sm text-[#E8E5DC] hover:bg-white/5 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {isDone ? "Convert another" : "Background"}
        </button>
      </div>

      {/* Log */}
      <div className="w-full rounded-2xl border border-white/8 overflow-hidden">
        <button
          onClick={() => setLogOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-muted hover:text-[#E8E5DC] transition-colors"
        >
          <span>ffmpeg log</span>
          {logOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {logOpen && (
          <ScrollArea.Root className="h-48 border-t border-white/8">
            <ScrollArea.Viewport className="w-full h-full">
              <div className="p-3 font-mono text-xs text-muted space-y-0.5">
                {logLines.map((line, i) => (
                  <div key={i} className="break-all leading-relaxed">
                    {line}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="w-1.5 p-0.5">
              <ScrollArea.Thumb className="bg-white/20 rounded-full" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        )}
      </div>
    </div>
  );
}
