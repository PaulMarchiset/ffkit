import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { formatTimecode, parseTimecode } from "@/lib/format";
import { useWaveform } from "@/lib/useWaveform";
import type { FileInfo } from "@/lib/types";

const BUCKETS = 160;
// Max bar height as a % of the track, so the loudest peak leaves headroom
// above/below instead of filling the full track height.
const MAX_BAR_PCT = 55;

interface Props {
  inputFile: FileInfo | null;
  startValue: string;
  endValue: string;
  onChange: (key: "start" | "end", value: string) => void;
}

/**
 * Trim "Selection" control: a real audio waveform (peaks decoded in the Rust
 * backend) with two draggable handles mapped to the file's actual duration.
 * The handles and the Start/End timecode fields stay in sync; for files with
 * no audio the track renders a flat baseline and still works as a scrubber.
 */
export function TrimSelector({ inputFile, startValue, endValue, onChange }: Props) {
  const { t } = useTranslation();
  const duration = inputFile?.duration ?? null;
  const { peaks, loading } = useWaveform(
    inputFile?.path ?? null,
    BUCKETS,
    !!inputFile,
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  // Selection in seconds, derived from the timecode fields (clamped to media).
  const startSec = clamp(parseTimecode(startValue) ?? 0, 0, duration ?? Infinity);
  const endSec = clamp(
    parseTimecode(endValue) ?? duration ?? 0,
    0,
    duration ?? Infinity,
  );

  const canDrag = duration != null && duration > 0;
  const startPct = canDrag ? (startSec / duration) * 100 : 0;
  const endPct = canDrag ? (endSec / duration) * 100 : 100;

  // Window-level listeners while dragging so the handle keeps tracking the
  // pointer even if it leaves the track bounds.
  useEffect(() => {
    if (!dragging || !canDrag) return;

    function timeAt(clientX: number): number {
      const rect = trackRef.current!.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      return ratio * duration!;
    }

    function onMove(e: PointerEvent) {
      const t = timeAt(e.clientX);
      if (dragging === "start") {
        onChange("start", formatTimecode(clamp(t, 0, endSec)));
      } else {
        onChange("end", formatTimecode(clamp(t, startSec, duration!)));
      }
    }
    function onUp() {
      setDragging(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, canDrag, duration, startSec, endSec, onChange]);

  // Render `BUCKETS` bars: real peaks once decoded, a gentle flat baseline
  // otherwise. A bar is "selected" when its center falls inside [start, end].
  const bars = peaks ?? Array.from({ length: BUCKETS }, () => 0.12);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <label className="text-sm text-muted">{t("trim.selection")}</label>
        <span className="font-mono text-sm text-fg tabular-nums">
          {formatTimecode(Math.max(0, endSec - startSec))}
        </span>
      </div>

      <div
        ref={trackRef}
        className="relative h-24 rounded-[10px] border border-border-soft bg-surface-2 overflow-hidden select-none"
      >
        {/* Waveform bars */}
        <div className="absolute inset-0 flex items-center gap-px px-1">
          {bars.map((h, i) => {
            const t = canDrag ? ((i + 0.5) / bars.length) * duration : 0;
            const selected = canDrag ? t >= startSec && t <= endSec : true;
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-colors",
                  selected ? "bg-accent" : "bg-elevate-5",
                )}
                style={{ height: `${Math.max(4, h * MAX_BAR_PCT)}%` }}
              />
            );
          })}
        </div>

        {canDrag && (
          <>
            {/* Dimmed regions outside the selection */}
            <div
              className="absolute inset-y-0 left-0 bg-bg/55 pointer-events-none"
              style={{ width: `${startPct}%` }}
            />
            <div
              className="absolute inset-y-0 right-0 bg-bg/55 pointer-events-none"
              style={{ width: `${100 - endPct}%` }}
            />
            {/* Draggable handles */}
            <Handle pct={startPct} active={dragging === "start"} onGrab={() => setDragging("start")} />
            <Handle pct={endPct} active={dragging === "end"} onGrab={() => setDragging("end")} />
          </>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-muted">{t("trim.readingAudio")}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TimeField label={t("field.start")} value={startValue} onChange={(v) => onChange("start", v)} />
        <TimeField label={t("field.end")} value={endValue} onChange={(v) => onChange("end", v)} />
      </div>
    </div>
  );
}

function Handle({
  pct,
  active,
  onGrab,
}: {
  pct: number;
  active: boolean;
  onGrab: () => void;
}) {
  return (
    <div
      onPointerDown={(e) => {
        e.preventDefault();
        onGrab();
      }}
      className="absolute inset-y-0 -ml-1.5 w-3 cursor-ew-resize flex items-center justify-center group"
      style={{ left: `${pct}%` }}
    >
      <div
        className={cn(
          "h-full w-0.5 bg-accent transition-colors",
          active ? "bg-accent" : "group-hover:bg-accent",
        )}
      />
      <div
        className={cn(
          "absolute h-9 w-3 rounded-[4px] bg-accent flex flex-col items-center justify-center gap-0.5 shadow-sm",
          active ? "scale-105" : "",
        )}
      >
        <span className="h-2.5 w-px bg-white/70" />
        <span className="h-2.5 w-px bg-white/70" />
      </div>
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-muted">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent font-mono text-base select-none pointer-events-none">
          &gt;
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="w-full pl-9 pr-4 py-3 rounded-[10px] border border-border-soft bg-surface-2 text-fg font-mono text-base outline-none focus:border-accent/40 transition-colors"
        />
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
