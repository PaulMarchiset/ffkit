import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Clock, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { basename } from "@/lib/path";
import { jobsService } from "@/lib/services/jobsService";
import { useJobsByIds } from "@/lib/jobsContext";
import { JobActions } from "./JobActions";
import type { BatchItem } from "@/lib/types";

interface Props {
  items: BatchItem[];
  /** Leave the batch running in the background (jobs keep going in the dock). */
  onBack: () => void;
  /** Start fresh once the batch is finished. */
  onConvertAnother: () => void;
}

type ItemState = "queued" | "running" | "done" | "failed" | "cancelled";

const TERMINAL: ItemState[] = ["done", "failed", "cancelled"];

export function BatchProgress({ items, onBack, onConvertAnother }: Props) {
  const { t } = useTranslation();
  const ids = useMemo(() => items.map((i) => i.jobId), [items]);
  const { jobs, done } = useJobsByIds(ids);
  const [cancelling, setCancelling] = useState(false);

  // Capture the final written size the moment a job completes — the shared store
  // zeroes live progress a few seconds after a job finishes (auto-clear).
  const [finalSizes, setFinalSizes] = useState<Record<string, number>>({});
  useEffect(() => {
    setFinalSizes((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of ids) {
        if (done[id]?.success && prev[id] == null) {
          const size = jobs[id]?.totalSize ?? 0;
          if (size > 0) {
            next[id] = size;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [ids, done, jobs]);

  function viewOf(id: string): { state: ItemState; progress: number; size: number; error?: string } {
    const d = done[id];
    const j = jobs[id];
    const size = finalSizes[id] ?? j?.totalSize ?? 0;
    if (d) {
      const state: ItemState = d.cancelled ? "cancelled" : d.success ? "done" : "failed";
      return { state, progress: d.success ? 100 : (j?.progress ?? 0), size, error: d.error };
    }
    if (j) return { state: j.state as ItemState, progress: j.progress, size, error: j.error };
    return { state: "queued", progress: 0, size: 0 };
  }

  const views = items.map((item) => ({ item, view: viewOf(item.jobId) }));
  const terminalCount = views.filter(({ view }) => TERMINAL.includes(view.state)).length;
  const doneCount = views.filter(({ view }) => view.state === "done").length;
  const allTerminal = terminalCount === items.length;
  const overall = items.length
    ? views.reduce(
        (sum, { view }) =>
          sum + (TERMINAL.includes(view.state) ? 100 : view.progress),
        0,
      ) / items.length
    : 0;

  async function cancelAll() {
    setCancelling(true);
    try {
      await Promise.all(
        views
          .filter(({ view }) => !TERMINAL.includes(view.state))
          .map(({ item }) => jobsService.cancel(item.jobId).catch(() => {})),
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto w-full pt-[10vh] pb-8">
      <div className="w-full flex flex-col gap-1">
        <h2 className="text-xl font-medium text-fg">
          {allTerminal
            ? t("batch.progress.done", { done: doneCount, total: items.length })
            : t("batch.progress.running", { done: terminalCount, total: items.length })}
        </h2>
        <div className="mt-2 h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${Math.min(100, overall)}%` }}
          />
        </div>
      </div>

      <ul className="w-full flex flex-col gap-2">
        {views.map(({ item, view }) => (
          <BatchRow
            key={item.jobId}
            item={item}
            state={view.state}
            progress={view.progress}
            size={view.size}
            error={view.error}
            onCancel={() => jobsService.cancel(item.jobId).catch(() => {})}
          />
        ))}
      </ul>

      <JobActions
        status={allTerminal ? "success" : "running"}
        cancelling={cancelling}
        onCancel={cancelAll}
        onBack={onBack}
        onConvertAnother={onConvertAnother}
      />
    </div>
  );
}

interface RowProps {
  item: BatchItem;
  state: ItemState;
  progress: number;
  size: number;
  error?: string;
  onCancel: () => void;
}

function BatchRow({ item, state, progress, size, error, onCancel }: RowProps) {
  const { t } = useTranslation();
  const savings =
    state === "done" && size > 0 && item.file.size > 0
      ? Math.round((1 - size / item.file.size) * 100)
      : null;

  return (
    <li className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface">
      <StatusIcon state={state} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-fg">{basename(item.file.name)}</span>
          <span className="flex-shrink-0 text-xs text-muted">
            {t(`quality.${item.quality}.label`)}
          </span>
        </div>
        {state === "running" && (
          <div className="mt-1.5 h-1 w-full rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        )}
        {state === "failed" && error && (
          <p className="mt-1 text-xs text-red-400 font-mono truncate">{error}</p>
        )}
      </div>

      <div className="flex-shrink-0 text-right text-xs">
        {state === "running" && (
          <span className="text-muted tabular-nums">{Math.round(progress)}%</span>
        )}
        {state === "queued" && <span className="text-muted">{t("batch.status.queued")}</span>}
        {state === "cancelled" && (
          <span className="text-muted">{t("batch.status.cancelled")}</span>
        )}
        {state === "done" && (
          <span className="text-fg">
            {formatBytes(size)}
            {savings != null && (
              <span className={cn("ml-1.5", savings >= 0 ? "text-accent" : "text-red-500")}>
                {savings >= 0 ? `-${savings}%` : `+${Math.abs(savings)}%`}
              </span>
            )}
          </span>
        )}
      </div>

      {(state === "queued" || state === "running") && (
        <button
          onClick={onCancel}
          title={t("common.cancel")}
          aria-label={t("common.cancel")}
          className="flex-shrink-0 text-muted hover:text-red-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}

function StatusIcon({ state }: { state: ItemState }) {
  const base = "w-5 h-5 flex-shrink-0";
  switch (state) {
    case "running":
      return <Loader2 className={cn(base, "text-accent animate-spin")} />;
    case "done":
      return <Check className={cn(base, "text-accent")} />;
    case "failed":
      return <AlertCircle className={cn(base, "text-red-400")} />;
    case "cancelled":
      return <X className={cn(base, "text-muted")} />;
    default:
      return <Clock className={cn(base, "text-muted")} />;
  }
}
