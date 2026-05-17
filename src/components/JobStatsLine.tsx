import { formatBytes, formatEta } from "@/lib/utils";
import type { JobProgressState } from "@/lib/useJobEvents";

interface Props {
  progress: JobProgressState;
}

export function JobStatsLine({ progress }: Props) {
  return (
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
  );
}
