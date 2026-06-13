import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { DockJob } from "@/lib/jobsContext";
import { JobRow } from "./JobRow";

interface Props {
  jobs: DockJob[];
  onDismiss: (id: string) => void;
  onSelect?: (id: string, outputPath: string) => void;
}

function summarize(jobs: DockJob[], t: TFunction): string {
  const running = jobs.filter(
    (j) => j.state === "running" || j.state === "queued",
  ).length;
  if (running > 0) return t("dock.running", { count: running });
  return t("dock.jobs", { count: jobs.length });
}

export function JobsDock({ jobs, onDismiss, onSelect }: Props) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  if (jobs.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-t border-border-soft bg-surface">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-5 py-2 flex items-center justify-between text-xs text-muted hover:text-fg transition-colors"
      >
        <span>
          {t("dock.title")} <span className="ml-1 text-fg">· {summarize(jobs, t)}</span>
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
