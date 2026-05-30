import { Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBytes, formatDuration } from "@/lib/format";
import type { FileInfo } from "@/lib/types";
import { UploadIcon } from "./icons/UploadIcon";

interface Props {
  file: FileInfo;
  onClick: () => void;
  onConvert?: () => void;
  converting?: boolean;
}

export function FileCard({ file, onClick, onConvert, converting }: Props) {
  return (
    <div
      className="relative w-full rounded-2xl bg-surface border border-border-subtle px-5 py-7 cursor-pointer group hover:border-border transition-all"
      onClick={onClick}
    >
      <div className="flex items-center gap-4 pr-14">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
          <UploadIcon size={18} stroke="#5F8D42" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-fg truncate text-sm">{file.name}</p>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
            <span>{formatBytes(file.size)}</span>
            {file.duration != null && <span>{formatDuration(file.duration)}</span>}
            {file.width && file.height && <span>{file.width}×{file.height}</span>}
            {file.videoCodec && <span>{file.videoCodec.toUpperCase()}</span>}
          </div>
        </div>
      </div>

      {onConvert && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConvert();
          }}
          disabled={converting}
          className={cn(
            "absolute bottom-3 right-3 w-9 h-9 rounded-[10px] flex items-center justify-center transition-all",
            "bg-accent hover:bg-accent/85",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          title="Convert"
        >
          {converting ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Zap className="w-4 h-4 text-white" />
          )}
        </button>
      )}

      <span className="absolute top-3 right-3 text-xs text-muted group-hover:text-subtle transition-colors">
        Click to change
      </span>
    </div>
  );
}
