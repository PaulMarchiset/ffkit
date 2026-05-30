import { useEffect, useRef, useState } from "react";
import { jobsService } from "@/lib/services/jobsService";
import { useTypewriter } from "@/lib/useTypewriter";
import { useJobEvents } from "@/lib/jobsContext";
import { getPhasePool } from "@/lib/jobPhaseWords";
import { JobStatusWord } from "./JobStatusWord";
import { JobStatsLine } from "./JobStatsLine";
import { JobActions } from "./JobActions";
import { JobLog } from "./JobLog";

interface Props {
  jobId: string;
  outputPath: string;
  onBack: () => void;
}

type JobStatus = "running" | "success" | "cancelled" | "failed";

export function JobProgress({ jobId, outputPath, onBack }: Props) {
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

  async function handleCancel() {
    setCancelling(true);
    try {
      await jobsService.cancel(jobId);
    } finally {
      setCancelling(false);
    }
  }

  const status: JobStatus = !done
    ? "running"
    : done.success
      ? "success"
      : done.cancelled
        ? "cancelled"
        : "failed";

  const terminalText =
    status === "running"
      ? null
      : status === "success"
        ? "Done."
        : status === "cancelled"
          ? "Cancelled."
          : "Failed.";

  return (
    <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto w-full py-8">
      <JobStatusWord displayedWord={displayedWord} terminalText={terminalText} />

      {status === "running" && <JobStatsLine progress={progress} />}

      {status === "success" && (
        <p className="text-sm text-muted text-center max-w-sm break-all px-2">{outputPath}</p>
      )}

      {status === "failed" && done?.error && (
        <p className="text-sm text-red-400 font-mono text-center max-w-sm break-all px-2">{done.error}</p>
      )}

      <JobActions
        status={status}
        cancelling={cancelling}
        outputPath={outputPath}
        onCancel={handleCancel}
        onBack={onBack}
      />

      <JobLog lines={logLines} />
    </div>
  );
}
