import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { useSizeEstimate } from "@/lib/useSizeEstimate";
import { formatBytes } from "@/lib/format";
import { ShrinkArrow } from "./icons/ShrinkArrow";
import type { FileInfo, Quality } from "@/lib/types";

interface Props {
  file: FileInfo;
  quality: Quality;
}

/** Output-size estimate, shown as its own hairline-separated row at the bottom
 *  of the file card: an instant range, then the exact sample-encoded figure with
 *  the savings vs the source ("X% smaller" green / "X% larger" red). */
export function SizeEstimateLine({ file, quality }: Props) {
  const { t } = useTranslation();
  const estimate = useSizeEstimate(file, quality);

  if (estimate.kind === "none") return null;

  let value: string;
  let savings: { text: string; isIncrease: boolean } | null = null;

  if (estimate.kind === "range") {
    value = `~${formatBytes(estimate.min)} – ${formatBytes(estimate.max)}`;
  } else {
    value = `~${formatBytes(estimate.bytes)}`;
    if (file.size > 0) {
      const pct = Math.round((1 - estimate.bytes / file.size) * 100);
      savings =
        pct >= 0
          ? { text: t("estimate.smaller", { percent: pct }), isIncrease: false }
          : { text: t("estimate.larger", { percent: Math.abs(pct) }), isIncrease: true };
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-border-soft pt-3 text-xs">
      <ShrinkArrow className="w-4 h-4 flex-shrink-0 text-muted relative -top-0.5" />
      <span className="font-medium text-fg">{value}</span>
      {savings && (
        <>
          <span className="text-subtle/40">·</span>
          <span className={cn(savings.isIncrease ? "text-red-500" : "text-accent")}>
            {savings.text}
          </span>
        </>
      )}
      {estimate.kind === "range" && (
        <span className="italic text-muted opacity-70">{t("estimate.refining")}</span>
      )}
    </div>
  );
}
