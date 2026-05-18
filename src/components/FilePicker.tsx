import { useEffect, useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { cn, formatBytes, formatDuration } from "@/lib/utils";
import { pickVideoFile, probeFile, type FileInfo } from "@/lib/tauri";

interface Props {
  file: FileInfo | null;
  onFile: (info: FileInfo) => void;
  onConvert?: () => void;
  converting?: boolean;
}

function UploadIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 32L24 24L16 32M24 24V42M40 33.4857C42.443 31.4681 44 28.4159 44 25C44 18.9249 39.0751 14 33 14C32.563 14 32.1541 13.772 31.9322 13.3955C29.3241 8.96967 24.5089 6 19 6C10.7157 6 4 12.7157 4 21C4 25.1322 5.67089 28.8742 8.3739 31.5871" stroke="#87867E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function FilePicker({ file, onFile, onConvert, converting }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Same two-layer race defense as useJobEvents — see comment there.
    let cancelled = false;
    let unlisten: (() => void) | null = null;

    const win = getCurrentWebviewWindow();
    win
      .onDragDropEvent(async (event) => {
        if (cancelled) return;
        const evtType = event.payload.type as string;
        if (evtType === "over" || evtType === "enter") {
          setDragging(true);
        } else if (evtType === "leave" || evtType === "cancel") {
          setDragging(false);
        } else if (evtType === "drop") {
          setDragging(false);
          const paths = (event.payload as { type: string; paths: string[] }).paths;
          if (paths && paths.length > 0) {
            await loadFile(paths[0]);
          }
        }
      })
      .then((u) => {
        if (cancelled) u();
        else unlisten = u;
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFile(path: string) {
    setLoading(true);
    setError(null);
    try {
      const info = await probeFile(path);
      onFile(info);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleClick() {
    const path = await pickVideoFile();
    if (path) await loadFile(path);
  }

  if (file) {
    return (
      <div
        className="relative w-full rounded-2xl bg-surface border border-border-subtle px-5 py-7 cursor-pointer group hover:border-border transition-all"
        onClick={handleClick}
      >
        <div className="flex items-center gap-4 pr-14">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 32L24 24L16 32M24 24V42M40 33.4857C42.443 31.4681 44 28.4159 44 25C44 18.9249 39.0751 14 33 14C32.563 14 32.1541 13.772 31.9322 13.3955C29.3241 8.96967 24.5089 6 19 6C10.7157 6 4 12.7157 4 21C4 25.1322 5.67089 28.8742 8.3739 31.5871" stroke="#5F8D42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
            onClick={(e) => { e.stopPropagation(); onConvert(); }}
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

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl bg-surface flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
        "border border-border-subtle",
        dragging ? "border-accent/50 bg-accent/5" : "hover:border-border",
        loading && "opacity-60 pointer-events-none",
      )}
      style={{ minHeight: "160px" }}
      onClick={handleClick}
    >
      <UploadIcon />

      {loading ? (
        <p className="text-muted text-sm">Reading file…</p>
      ) : (
        <p className={cn("text-sm transition-colors", dragging ? "text-fg" : "text-muted")}>
          {dragging ? "Drop your video" : "Drop your video here"}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400 mt-1 px-6 text-center">{error}</p>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); handleClick(); }}
        className="absolute bottom-3 right-3 w-9 h-9 rounded-[10px] bg-accent flex items-center justify-center hover:bg-accent/85 transition-colors"
        title="Browse files"
      >
        <Zap className="w-4 h-4 text-white" />
      </button>
    </div>
  );
}
