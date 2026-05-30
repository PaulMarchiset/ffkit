import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { DockJob } from "@/lib/jobsContext";
import { JobRow } from "./JobRow";

interface Props {
  jobs: DockJob[];
  onDismiss: (id: string) => void;
  onSelect?: (id: string, outputPath: string) => void;
}

function summarize(jobs: DockJob[]): string {
  const running = jobs.filter(
    (j) => j.state === "running" || j.state === "queued",
  ).length;
  if (running > 0) return `${running} running`;
  return `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`;
}

export function JobsDock({ jobs, onDismiss, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (jobs.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-t border-border-soft bg-surface">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-5 py-2 flex items-center justify-between text-xs text-muted hover:text-fg transition-colors"
      >
        <span>
          Jobs <span className="ml-1 text-fg">· {summarize(jobs)}</span>
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
