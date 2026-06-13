import { useTranslation } from "react-i18next";
import { formatBytes } from "@/lib/format";
import type { JobProgressState } from "@/lib/jobsContext";
import { JobStat } from "./JobStat";

interface Props {
  progress: JobProgressState;
}

/** The running view: big percentage, a progress bar, and the live stats card
 *  (speed / bytes written / realtime multiplier). */
export function JobProgressMeter({ progress }: Props) {
  const { t } = useTranslation();
  const pct = Math.max(0, Math.min(100, progress.percentage));

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3">
        <span className="font-mono text-xl text-fg tabular-nums">
          {Math.round(pct)}%
        </span>
        <div className="w-full h-2 rounded-full bg-elevate-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent/50 to-accent transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="w-full rounded-2xl bg-elevate-1 px-6 py-5 grid grid-cols-3">
        <JobStat value={`${Math.round(progress.fps)} fps`} label={t("job.speed")} />
        <JobStat value={formatBytes(progress.totalSize)} label={t("job.written")} />
        <JobStat value={`${progress.speed.toFixed(1)}x`} label={t("job.realtime")} />
      </div>
    </div>
  );
}
