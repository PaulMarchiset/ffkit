import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { cancelJob } from "@/lib/tauri";
import { formatEta, cn } from "@/lib/utils";
import type { DockJob } from "@/lib/useAllJobs";

interface Props {
  jobs: DockJob[];
  onDismiss: (id: string) => void;
  onSelect?: (id: string, outputPath: string) => void;
}

function basename(path: string): string {
  const sep = path.includes("\\") ? "\\" : "/";
  const idx = path.lastIndexOf(sep);
  return idx >= 0 ? path.slice(idx + 1) : path;
}

export function JobsDock({ jobs, onDismiss, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (jobs.length === 0) return null;

  const running = jobs.filter(
    (j) => j.state === "running" || j.state === "queued",
  ).length;
  const summary =
    running > 0
      ? `${running} running`
      : `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`;

  return (
    <div className="flex-shrink-0 border-t border-border-soft bg-surface">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-5 py-2 flex items-center justify-between text-xs text-muted hover:text-fg transition-colors"
      >
        <span>
          Jobs <span className="ml-1 text-fg">· {summary}</span>
        </span>
        {collapsed ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>
      {!collapsed && (
        <div className="max-h-48 overflow-y-auto px-3 pb-2 flex flex-col gap-1">
          {jobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              onDismiss={onDismiss}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  job: DockJob;
  onDismiss: (id: string) => void;
  onSelect?: (id: string, outputPath: string) => void;
}

function JobRow({ job, onDismiss, onSelect }: RowProps) {
  const isTerminal =
    job.state === "done" ||
    job.state === "cancelled" ||
    job.state === "failed";
  const name = basename(job.inputPath);

  async function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    if (isTerminal) {
      onDismiss(job.id);
    } else {
      await cancelJob(job.id);
    }
  }

  function handleClick() {
    if (onSelect && !isTerminal) onSelect(job.id, job.outputPath);
  }

  const barColor =
    job.state === "failed"
      ? "bg-red-400"
      : job.state === "cancelled"
        ? "bg-muted/40"
        : "bg-accent";

  const rightLabel = isTerminal
    ? job.state
    : `${job.progress.toFixed(0)}%`;

  const rightLabelColor =
    job.state === "failed"
      ? "text-red-400"
      : job.state === "done"
        ? "text-accent"
        : "text-muted";

  return (
    <div
      onClick={handleClick}
      title={job.error ?? name}
      className={cn(
        "px-2 py-1.5 rounded-md flex items-center gap-3 transition-colors",
        !isTerminal && onSelect && "cursor-pointer hover:bg-white/5",
      )}
    >
      <span className="flex-1 min-w-0 truncate text-sm text-fg">{name}</span>
      <div className="w-32 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn("h-full transition-all", barColor)}
          style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs w-16 text-right tabular-nums",
          rightLabelColor,
        )}
      >
        {rightLabel}
      </span>
      <span className="text-xs text-muted w-14 text-right tabular-nums">
        {!isTerminal && job.etaSecs > 0 ? formatEta(job.etaSecs) : "—"}
      </span>
      <button
        onClick={handleClose}
        className="p-1 rounded text-muted hover:text-fg hover:bg-white/5 transition-colors"
        title={isTerminal ? "Dismiss" : "Cancel"}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
