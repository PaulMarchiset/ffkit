import { FolderOpen, RotateCcw, X } from "lucide-react";
import { filesService } from "@/lib/services/filesService";
import { parentDir } from "@/lib/path";
import type { JobViewStatus } from "@/lib/types";

interface Props {
  status: JobViewStatus;
  cancelling: boolean;
  outputPath: string;
  onCancel: () => void;
  onBack: () => void;
}

export function JobActions({ status, cancelling, outputPath, onCancel, onBack }: Props) {
  const isDone = status !== "running";
  const isSuccess = status === "success";
  return (
    <div className="flex gap-3">
      {!isDone && (
        <button
          onClick={onCancel}
          disabled={cancelling}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-border-strong text-sm text-muted hover:text-fg hover:border-white/25 transition-colors disabled:opacity-40"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      )}
      {isSuccess && (
        <button
          onClick={() => filesService.openPath(parentDir(outputPath))}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-accent/50 text-sm text-accent bg-accent/10 hover:bg-accent/15 transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          Open folder
        </button>
      )}
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-border-strong text-sm text-fg hover:bg-white/5 transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        {isDone ? "Convert another" : "Background"}
      </button>
    </div>
  );
}
