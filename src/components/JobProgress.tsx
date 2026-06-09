import { useEffect, useRef, useState } from "react";
import { jobsService } from "@/lib/services/jobsService";
import { useTypewriter } from "@/lib/useTypewriter";
import { useJobEvents } from "@/lib/jobsContext";
import { getPhasePool } from "@/lib/jobPhaseWords";
import type { JobInputMeta, JobViewStatus } from "@/lib/types";
import { JobStatusWord } from "./JobStatusWord";
import { JobProgressMeter } from "./JobProgressMeter";
import { JobResultCard } from "./JobResultCard";
import { JobActions } from "./JobActions";
import { JobLog } from "./JobLog";

interface Props {
  jobId: string;
  outputPath: string;
  inputMeta?: JobInputMeta;
  /** Leave a running job in the background (keeps the converter as-is). */
  onBack: () => void;
  /** Start fresh after a finished job (clears the selected media). */
  onConvertAnother: () => void;
}

export function JobProgress({
  jobId,
  outputPath,
  inputMeta,
  onBack,
  onConvertAnother,
}: Props) {
  const { progress, done, logLines } = useJobEvents(jobId);
  const [cancelling, setCancelling] = useState(false);

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

  // Freeze the final written size when the job finishes: the shared job store
  // resets live progress to zero a few seconds after completion (auto-clear),
  // so the result card needs its own captured copy of the real size.
  const [finalSize, setFinalSize] = useState<number | null>(null);
  useEffect(() => {
    if (done && finalSize === null) setFinalSize(progress.totalSize);
  }, [done, progress.totalSize, finalSize]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await jobsService.cancel(jobId);
    } finally {
      setCancelling(false);
    }
  }

  const status: JobViewStatus = !done
    ? "running"
    : done.success
      ? "success"
      : done.cancelled
        ? "cancelled"
        : "failed";

  return (
    <div className="flex flex-col items-center gap-8 max-w-xl mx-auto w-full pt-[12vh] pb-8">
      <JobStatusWord status={status} displayedWord={displayedWord} />

      {status === "running" && <JobProgressMeter progress={progress} />}

      {status === "success" && (
        <JobResultCard
          outputPath={outputPath}
          outputSize={finalSize ?? progress.totalSize}
          durationMs={inputMeta?.durationMs}
          inputSize={inputMeta?.size}
        />
      )}

      {status === "failed" && done?.error && (
        <p className="text-sm text-red-400 font-mono text-center max-w-sm break-all px-2">
          {done.error}
        </p>
      )}

      <JobActions
        status={status}
        cancelling={cancelling}
        onCancel={handleCancel}
        onBack={onBack}
        onConvertAnother={onConvertAnother}
      />

      {(status === "running" || status === "failed") && logLines.length > 0 && (
        <JobLog lines={logLines} />
      )}
    </div>
  );
}
