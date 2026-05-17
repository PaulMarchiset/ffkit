import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, FolderOpen, RotateCcw, X } from "lucide-react";
import { formatBytes, formatEta } from "@/lib/utils";
import {
  onJobProgress,
  onJobDone,
  onJobLog,
  cancelJob,
  openPath,
  type JobProgressEvent,
  type JobDoneEvent,
} from "@/lib/tauri";
import * as ScrollArea from "@radix-ui/react-scroll-area";

const PHASE_WORDS = {
  analysis: [
    "Probing", "Inspecting", "Scanning", "Reading", "Parsing",
    "Sniffing", "Examining", "Surveying", "Demuxing", "Decoding",
    "Detecting", "Identifying", "Measuring",
  ],
  planning: [
    "Planning", "Choosing", "Selecting", "Mapping", "Routing",
    "Configuring", "Preparing", "Calibrating", "Negotiating",
  ],
  encoding: [
    "Encoding", "Transcoding", "Processing", "Crunching", "Compressing",
    "Rendering", "Computing", "Working", "Running", "Churning", "Grinding",
    "Cooking", "Chewing", "Munching",
    "Filtering", "Scaling", "Resampling", "Resizing", "Cropping",
    "Trimming", "Stretching", "Sharpening", "Denoising", "Deinterlacing",
    "Interpolating", "Quantizing", "Sampling", "Buffering", "Streaming",
    "Threading", "Piping", "Flowing",
    "Mixing", "Remixing", "Normalizing", "Syncing", "Aligning", "Dithering",
    "Muxing", "Remuxing", "Packaging", "Containing", "Assembling",
    "Stitching", "Merging", "Concatenating",
    "Brewing", "Wrangling", "Coaxing", "Massaging", "Nudging",
    "Tinkering", "Whispering", "Persuading", "Hustling", "Shuffling",
  ],
  finishing: [
    "Finalizing", "Flushing", "Sealing", "Writing", "Saving",
    "Verifying", "Validating", "Checking", "Polishing", "Closing",
  ],
};

function getPool(pct: number): string[] {
  if (pct < 3) return PHASE_WORDS.analysis;
  if (pct < 10) return PHASE_WORDS.planning;
  if (pct >= 93) return PHASE_WORDS.finishing;
  return PHASE_WORDS.encoding;
}

function StarIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="currentColor"
      className="text-accent animate-star flex-shrink-0"
    >
      <path d="M5 0 L5.6 4.4 L10 5 L5.6 5.6 L5 10 L4.4 5.6 L0 5 L4.4 4.4 Z" />
    </svg>
  );
}

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

  const [displayedWord, setDisplayedWord] = useState("Probing");
  const currentWordRef = useRef("Probing");
  const progressRef = useRef(0);

  useEffect(() => {
    progressRef.current = progress.percentage;
  }, [progress.percentage]);

  useEffect(() => {
    if (done) return;

    let cancelled = false;
    let typingTimer: ReturnType<typeof setInterval> | null = null;
    let waitTimer: ReturnType<typeof setTimeout> | null = null;

    const showNext = () => {
      if (cancelled) return;
      const pool = getPool(progressRef.current);
      const next = pool[Math.floor(Math.random() * pool.length)];
      const current = currentWordRef.current;
      const steps = Math.max(next.length, current.length);
      const charDelay = Math.max(45, 750 / steps);

      let i = 0;
      typingTimer = setInterval(() => {
        if (cancelled) { clearInterval(typingTimer!); return; }
        i++;
        setDisplayedWord(next.slice(0, i) + current.slice(i));
        if (i >= steps) {
          clearInterval(typingTimer!);
          currentWordRef.current = next;
          setDisplayedWord(next);
          waitTimer = setTimeout(showNext, 2800);
        }
      }, charDelay);
    };

    waitTimer = setTimeout(showNext, 2800);

    return () => {
      cancelled = true;
      if (typingTimer) clearInterval(typingTimer);
      if (waitTimer) clearTimeout(waitTimer);
    };
  }, [done]);

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
    <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto w-full py-8">
      {/* Status word */}
      {!isDone ? (
        <div className="flex items-center gap-2 justify-center">
          <StarIcon />
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
            onClick={() =>
              openPath(
                outputPath
                  .split(/(\\|\/)/)
                  .slice(0, -1)
                  .join(outputPath.includes("\\") ? "\\" : "/"),
              )
            }
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
