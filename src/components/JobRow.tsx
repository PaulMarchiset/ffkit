import { X } from "lucide-react";
import { jobsService } from "@/lib/services/jobsService";
import { formatEta } from "@/lib/format";
import { cn } from "@/lib/cn";
import { basename } from "@/lib/path";
import type { DockJob } from "@/lib/jobsContext";

interface Props {
  job: DockJob;
  onDismiss: (id: string) => void;
  onSelect?: (id: string, outputPath: string) => void;
}

function isTerminalState(state: DockJob["state"]): boolean {
  return state === "done" || state === "cancelled" || state === "failed";
}

function progressBarColor(state: DockJob["state"]): string {
  if (state === "failed") return "bg-red-400";
  if (state === "cancelled") return "bg-muted/40";
  return "bg-accent";
}

function rightLabelTextColor(state: DockJob["state"]): string {
  if (state === "failed") return "text-red-400";
  if (state === "done") return "text-accent";
  return "text-muted";
}

export function JobRow({ job, onDismiss, onSelect }: Props) {
  const terminal = isTerminalState(job.state);
  const name = basename(job.inputPath);

  async function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    if (terminal) {
      onDismiss(job.id);
    } else {
      await jobsService.cancel(job.id);
    }
  }

  function handleClick() {
    if (onSelect && !terminal) onSelect(job.id, job.outputPath);
  }

  const rightLabel = terminal ? job.state : `${job.progress.toFixed(0)}%`;

  return (
    <div
      onClick={handleClick}
      title={job.error ?? name}
      className={cn(
        "px-2 py-1.5 rounded-md flex items-center gap-3 transition-colors",
        !terminal && onSelect && "cursor-pointer hover:bg-white/5",
      )}
    >
      <span className="flex-1 min-w-0 truncate text-sm text-fg">{name}</span>
      <div className="w-32 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn("h-full transition-all", progressBarColor(job.state))}
          style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs w-16 text-right tabular-nums",
          rightLabelTextColor(job.state),
        )}
      >
        {rightLabel}
      </span>
      <span className="text-xs text-muted w-14 text-right tabular-nums">
        {!terminal && job.etaSecs > 0 ? formatEta(job.etaSecs) : "—"}
      </span>
      <button
        onClick={handleClose}
        className="p-1 rounded text-muted hover:text-fg hover:bg-white/5 transition-colors"
        title={terminal ? "Dismiss" : "Cancel"}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
