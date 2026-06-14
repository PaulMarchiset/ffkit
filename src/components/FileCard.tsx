import { useState } from "react";
import { FolderOpen, Info, Loader2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { formatBytes, formatDuration } from "@/lib/format";
import type { FileInfo, Quality } from "@/lib/types";
import { UploadIcon } from "./icons/UploadIcon";
import { MediaInfoModal } from "./MediaInfoModal";
import { SizeEstimateLine } from "./SizeEstimateLine";

interface Props {
  file: FileInfo;
  onClick: () => void;
  onConvert?: () => void;
  converting?: boolean;
  /** When set, the derived output path is shown below the file info. */
  outputPath?: string;
  onChangeOutput?: () => void;
  /** When set, an output-size estimate for this quality is shown. */
  quality?: Quality;
}

export function FileCard({
  file,
  onClick,
  onConvert,
  converting,
  outputPath,
  onChangeOutput,
  quality,
}: Props) {
  const { t } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);
  return (
    <div
      className="relative w-full rounded-2xl bg-surface overflow-hidden cursor-pointer group transition-all"
      onClick={onClick}
    >
      {/* Top: file info — unchanged layout (relative so the convert button and
          "Click to change" anchor to this section, not the whole card). */}
      <div className="relative px-5 pt-7 pb-4">
        <div className="flex items-center gap-4 pr-14">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
            <UploadIcon size={18} stroke="#5F8D42" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-fg truncate text-sm">{file.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted leading-none">
              {[
                formatBytes(file.size),
                file.duration != null ? formatDuration(file.duration) : null,
                file.width && file.height ? `${file.width}×${file.height}` : null,
                file.videoCodec ? file.videoCodec.toUpperCase() : null,
              ]
                .filter((item): item is string => item != null)
                .map((item, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-subtle/40">·</span>}
                    {item}
                  </span>
                ))}
              <span className="text-subtle/40">·</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfo(true);
                }}
                title={t("mediaInfo.title")}
                aria-label={t("mediaInfo.title")}
                className="flex items-center text-muted hover:text-fg transition-colors"
              >
                <Info className="w-3.5 h-3.5 block relative -top-px" />
              </button>
            </div>
            {quality && <SizeEstimateLine file={file} quality={quality} />}
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
            title={t("fileCard.convert")}
          >
            {converting ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Zap className="w-4 h-4 text-white" />
            )}
          </button>
        )}

        <span className="absolute top-3 right-3 text-xs text-muted group-hover:text-subtle transition-colors">
          {t("fileCard.clickToChange")}
        </span>
      </div>

      {showInfo && (
        <MediaInfoModal file={file} onClose={() => setShowInfo(false)} />
      )}

      {/* Bottom: the derived output path on a darker inset (no divider/border,
          no "OUTPUT" label). The folder icon opens the save dialog to change it;
          click propagation is stopped so it doesn't re-pick the input. */}
      {outputPath && (
        <div
          className="flex items-center gap-3 px-5 py-3 bg-surface-2 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="min-w-0 flex-1 text-sm text-muted truncate">{outputPath}</span>
          {onChangeOutput && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChangeOutput();
              }}
              title="Change output path"
              className="flex-shrink-0 text-muted hover:text-fg transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
