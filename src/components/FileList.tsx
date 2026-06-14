import { useMemo, useState } from "react";
import { FolderOpen, Info, Loader2, Trash2, X, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { estimateSizeCenter } from "@/lib/sizeEstimate";
import { basename, parentDir } from "@/lib/path";
import type { FileInfo, Quality } from "@/lib/types";
import { UploadIcon } from "./icons/UploadIcon";
import { ShrinkArrow } from "./icons/ShrinkArrow";
import { MediaInfoModal } from "./MediaInfoModal";

/** "default" clears a file's override so it follows the global quality. */
export type QualityChoice = Quality | "default";

interface Props {
  files: FileInfo[];
  /** path → per-file quality override; absent = follow the global quality. */
  overrides: Record<string, Quality>;
  globalQuality: Quality;
  selected: Set<string>;
  /** Resolved destination folder (undefined = each file's source folder). */
  outputFolder?: string;
  namingPattern: string;
  loading: boolean;
  converting: boolean;
  onAddFiles: () => void;
  onRemoveFile: (path: string) => void;
  onToggleSelect: (path: string) => void;
  onToggleSelectAll: () => void;
  onApplyQuality: (choice: QualityChoice) => void;
  onChangeOutputFolder: () => void;
  onConvertAll: () => void;
  onRemoveAll: () => void;
}

const APPLY_CHOICES: QualityChoice[] = ["low", "medium", "lossless", "default"];

export function FileList({
  files,
  overrides,
  globalQuality,
  selected,
  outputFolder,
  namingPattern,
  loading,
  converting,
  onAddFiles,
  onRemoveFile,
  onToggleSelect,
  onToggleSelectAll,
  onApplyQuality,
  onChangeOutputFolder,
  onConvertAll,
  onRemoveAll,
}: Props) {
  const { t } = useTranslation();

  const totalSize = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files],
  );

  // Sum the instant per-file estimates (using each file's effective quality) for
  // an at-a-glance batch total. Exact sizes land per job as conversions run.
  const estimatedOut = useMemo(() => {
    let total = 0;
    for (const f of files) {
      const c = estimateSizeCenter(f, overrides[f.path] ?? globalQuality);
      total += c ?? f.size;
    }
    return total;
  }, [files, overrides, globalQuality]);

  const savingsPct =
    totalSize > 0 ? Math.round((1 - estimatedOut / totalSize) * 100) : 0;

  const formatLabel = useMemo(() => {
    const formats = new Set(
      files.map((f) => (f.container ?? f.name.split(".").pop() ?? "").toLowerCase()),
    );
    formats.delete("");
    if (formats.size === 0) return null;
    if (formats.size > 1) return t("batch.mixedFormat");
    return [...formats][0].toUpperCase();
  }, [files, t]);

  const allSelected = files.length > 0 && selected.size === files.length;
  const displayFolder = outputFolder ?? parentDir(files[0]?.path ?? "");
  const sep = displayFolder.includes("\\") ? "\\" : "/";

  return (
    <div className="w-full rounded-2xl bg-surface overflow-hidden">
      {/* Aggregate header — clicking it adds more files. Layout mirrors the
          single-file card: count → info → hairline → size estimate. */}
      <div
        className="relative px-5 pt-6 pb-4 cursor-pointer group"
        onClick={onAddFiles}
      >
        <div className="flex items-start gap-4 pr-14">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
            <UploadIcon size={18} stroke="#5F8D42" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-fg text-sm">
              {t("batch.fileCount", { count: files.length })}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted leading-none">
              <span>{formatBytes(totalSize)}</span>
              {formatLabel && (
                <>
                  <span className="text-subtle/40">·</span>
                  <span>{formatLabel}</span>
                </>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-border-soft pt-3 text-xs">
              <ShrinkArrow className="w-4 h-4 flex-shrink-0 text-muted relative -top-px" />
              <span className="font-medium text-fg">~{formatBytes(estimatedOut)}</span>
              {totalSize > 0 && (
                <span className={cn(savingsPct >= 0 ? "text-accent" : "text-red-500")}>
                  {savingsPct >= 0
                    ? t("estimate.smaller", { percent: savingsPct })
                    : t("estimate.larger", { percent: Math.abs(savingsPct) })}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onConvertAll();
          }}
          disabled={converting || files.length === 0}
          className={cn(
            "absolute bottom-3 right-3 w-9 h-9 rounded-[10px] flex items-center justify-center transition-all",
            "bg-accent hover:bg-accent/85 disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          title={t("batch.convertAll")}
        >
          {converting ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Zap className="w-4 h-4 text-white" />
          )}
        </button>

        <span className="absolute top-3 right-3 text-xs text-muted group-hover:text-subtle transition-colors">
          {loading ? t("dropzone.reading") : t("batch.addFiles")}
        </span>
      </div>

      {/* Selection / bulk-apply toolbar. */}
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 bg-surface-2 text-xs border-t border-border-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onToggleSelectAll}
          className="flex items-center gap-2.5 select-none"
        >
          <Checkbox checked={allSelected} />
          <span className="text-fg">
            {t("batch.selectedCount", { count: selected.size })}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-muted">{t("batch.apply")}</span>
          {APPLY_CHOICES.map((choice) => (
            <button
              key={choice}
              onClick={() => onApplyQuality(choice)}
              disabled={selected.size === 0}
              className="px-3 py-1.5 rounded-md border border-border text-subtle hover:border-transparent hover:text-fg hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {choice === "default"
                ? t("batch.default")
                : t(`quality.${choice}.label`)}
            </button>
          ))}
        </div>

        <button
          onClick={onRemoveAll}
          title={t("batch.removeAll")}
          aria-label={t("batch.removeAll")}
          className="ml-auto p-1.5 rounded-md border border-border text-muted hover:text-red-400 hover:border-border-hover transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* File rows. */}
      <ul className="divide-y divide-border-soft">
        {files.map((file) => (
          <FileRow
            key={file.path}
            file={file}
            quality={overrides[file.path] ?? globalQuality}
            hasOverride={overrides[file.path] != null}
            selected={selected.has(file.path)}
            onToggle={() => onToggleSelect(file.path)}
            onRemove={() => onRemoveFile(file.path)}
          />
        ))}
      </ul>

      {/* Output destination. */}
      <div
        className="flex items-center gap-3 px-5 py-3 bg-surface-2 cursor-default border-t border-border-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="min-w-0 flex-1 text-sm text-muted truncate">
          {displayFolder}
          {displayFolder ? sep : ""}
          {namingPattern}
        </span>
        <button
          onClick={onChangeOutputFolder}
          title={t("batch.changeFolder")}
          className="flex-shrink-0 text-muted hover:text-fg transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/** Checkbox styled to the design: transparent when off, accent-filled with the
 *  custom tick when on. */
function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "w-4 h-4 rounded-[5px] border flex items-center justify-center transition-colors flex-shrink-0",
        checked
          ? "bg-accent border-accent"
          : "bg-transparent border-border-strong group-hover/row:border-border-hover",
      )}
    >
      {checked && (
        <svg width="10" height="7" viewBox="0 0 10 7" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0.5 3.5L3.5 6.5L9.5 0.5"
            stroke="white"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

interface RowProps {
  file: FileInfo;
  quality: Quality;
  hasOverride: boolean;
  selected: boolean;
  onToggle: () => void;
  onRemove: () => void;
}

function FileRow({ file, quality, hasOverride, selected, onToggle, onRemove }: RowProps) {
  const { t } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);

  const estOut = estimateSizeCenter(file, quality);
  const savingsPct =
    estOut != null && file.size > 0
      ? Math.round((1 - estOut / file.size) * 100)
      : null;

  return (
    <li
      className={cn(
        "group/row flex items-center gap-3 px-5 py-3 transition-colors",
        selected && "bg-accent/10",
      )}
    >
      <button type="button" onClick={onToggle} className="flex-shrink-0">
        <Checkbox checked={selected} />
      </button>

      <div className="min-w-0 flex-1 flex items-center gap-1.5">
        <span className="truncate text-sm text-fg">{basename(file.name)}</span>
        <button
          onClick={() => setShowInfo(true)}
          title={t("mediaInfo.title")}
          aria-label={t("mediaInfo.title")}
          className="flex-shrink-0 text-muted opacity-0 group-hover/row:opacity-100 hover:text-fg transition-all"
        >
          <Info className="w-3.5 h-3.5 block relative -top-px" />
        </button>
      </div>

      {/* Metrics packed close together: preset · estimate · savings. Tune the
          inner `gap-*` and the column widths to tighten/loosen them. */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {/* Per-file quality label — blank when the file follows the global default. */}
        <span className="w-16 text-right text-xs text-accent">
          {hasOverride ? t(`quality.${quality}.label`) : ""}
        </span>

        <span className="w-20 text-right text-sm text-muted">
          {estOut != null ? `~${formatBytes(estOut)}` : formatBytes(file.size)}
        </span>

        <span
          className={cn(
            "w-12 text-right text-xs",
            savingsPct == null
              ? "text-transparent"
              : savingsPct >= 0
                ? "text-accent"
                : "text-red-500",
          )}
        >
          {savingsPct != null ? `${savingsPct >= 0 ? "-" : "+"}${Math.abs(savingsPct)}%` : ""}
        </span>
      </div>

      <button
        onClick={onRemove}
        title={t("batch.removeFile")}
        aria-label={t("batch.removeFile")}
        className="flex-shrink-0 ml-3 text-muted opacity-0 group-hover/row:opacity-100 hover:text-red-400 transition-all"
      >
        <X className="w-4 h-4" />
      </button>

      {showInfo && <MediaInfoModal file={file} onClose={() => setShowInfo(false)} />}
    </li>
  );
}
