import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { EncoderList } from "@/lib/types";

interface Props {
  loading: boolean;
  encoders: EncoderList | null;
}

export function EncoderBadge({ loading, encoders }: Props) {
  if (loading) {
    return <Loader2 className="w-3.5 h-3.5 animate-spin text-muted" />;
  }
  if (!encoders?.bestH264) return null;

  const best = encoders.available.find((e) => e.name === encoders.bestH264);
  const probed = best?.probed ?? true;
  const tooltip = probed
    ? `${encoders.bestH264} (probed OK)`
    : `${encoders.bestH264} — kept based on detected hardware; probe failed: ${best?.warning ?? "unknown reason"}`;

  return (
    <span
      title={tooltip}
      className={cn(
        "text-xs px-2 py-1 rounded-md leading-none cursor-help",
        probed ? "text-accent bg-accent/10" : "text-amber-300 bg-amber-300/10",
      )}
    >
      {encoders.bestH264}
      {!probed && " *"}
    </span>
  );
}
