import { Layers, RotateCw, X } from "lucide-react";
import type { JobViewStatus } from "@/lib/types";

interface Props {
  status: JobViewStatus;
  cancelling: boolean;
  onCancel: () => void;
  onBack: () => void;
  onConvertAnother: () => void;
}

const BTN =
  "flex items-center gap-2.5 px-5 py-3 rounded-xl border border-border-soft text-sm text-muted hover:text-fg hover:bg-white/5 hover:border-border-strong transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

export function JobActions({ status, cancelling, onCancel, onBack, onConvertAnother }: Props) {
  if (status === "running") {
    return (
      <div className="flex gap-3">
        {/* "Run in background" leaves the job running and returns to the
            converter; the dock keeps tracking it. */}
        <button onClick={onBack} className={BTN}>
          <Layers className="w-4 h-4" />
          Run in background
        </button>
        <button onClick={onCancel} disabled={cancelling} className={BTN}>
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={onConvertAnother} className={BTN}>
      <RotateCw className="w-4 h-4" />
      Convert another
    </button>
  );
}
