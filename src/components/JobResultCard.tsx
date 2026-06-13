import { FolderOpen, PlaySquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { filesService } from "@/lib/services/filesService";
import { basename, parentDir } from "@/lib/path";
import { formatBytes, formatTimecode } from "@/lib/format";
import { JobStat } from "./JobStat";

interface Props {
  outputPath: string;
  /** Final output size in bytes. */
  outputSize: number;
  /** Clip length (from the input probe); rendered as the TIME stat. */
  durationMs?: number;
  /** Input size, for the size-reduction ("SAVED") stat. */
  inputSize?: number;
}

/** The success card: file name + location with a folder shortcut, plus the
 *  size / duration / size-saved stats. */
export function JobResultCard({ outputPath, outputSize, durationMs, inputSize }: Props) {
  const { t } = useTranslation();
  const sep = outputPath.includes("\\") ? "\\" : "/";
  const name = basename(outputPath).replace(/\.[^.]+$/, "");
  const dir = `${parentDir(outputPath)}${sep}`;

  // Positive reduction = smaller than the source (the good case → "-42%").
  const reduction =
    inputSize && inputSize > 0 ? Math.round((1 - outputSize / inputSize) * 100) : null;
  const savedText =
    reduction == null ? "—" : reduction >= 0 ? `-${reduction}%` : `+${-reduction}%`;
  const savedClass =
    reduction == null ? "text-muted" : reduction >= 0 ? "text-accent" : "text-red-400";

  return (
    <div className="w-full rounded-2xl bg-elevate-1 p-5 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 grid place-items-center w-10 h-10 rounded-lg bg-accent/15 text-accent">
          <PlaySquare className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-fg truncate">{name}</div>
          <div className="text-xs text-muted truncate">{dir}</div>
        </div>
        <button
          onClick={() => filesService.openPath(parentDir(outputPath))}
          title="Open folder"
          className="flex-shrink-0 grid place-items-center w-9 h-9 rounded-lg border border-border-soft text-muted hover:text-fg hover:border-border-strong transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3">
        <JobStat value={formatBytes(outputSize)} label={t("job.size")} />
        <JobStat
          value={durationMs != null ? formatTimecode(durationMs / 1000) : "—"}
          label={t("job.time")}
        />
        <JobStat value={savedText} label={t("job.saved")} valueClassName={savedClass} />
      </div>
    </div>
  );
}
