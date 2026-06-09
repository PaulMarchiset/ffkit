import { formatBytes } from "@/lib/format";
import type { JobProgressState } from "@/lib/jobsContext";
import { JobStat } from "./JobStat";

interface Props {
  progress: JobProgressState;
}

/** The running view: big percentage, a progress bar, and the live stats card
 *  (speed / bytes written / realtime multiplier). */
export function JobProgressMeter({ progress }: Props) {
  const pct = Math.max(0, Math.min(100, progress.percentage));

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3">
        <span className="font-mono text-xl text-fg tabular-nums">
          {Math.round(pct)}%
        </span>
        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent/50 to-accent transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="w-full rounded-2xl bg-white/[0.03] px-6 py-5 grid grid-cols-3">
        <JobStat value={`${Math.round(progress.fps)} fps`} label="Speed" />
        <JobStat value={formatBytes(progress.totalSize)} label="Written" />
        <JobStat value={`${progress.speed.toFixed(1)}x`} label="Realtime" />
      </div>
    </div>
  );
}
