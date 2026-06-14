import { useEffect, useRef, useState } from "react";
import { filesService } from "@/lib/services/filesService";
import { estimateSizeRange } from "@/lib/sizeEstimate";
import type { FileInfo, Quality } from "@/lib/types";

export type SizeEstimate =
  | { kind: "none" }
  | { kind: "range"; min: number; max: number }
  | { kind: "exact"; bytes: number };

// Wait for quality/file changes to settle before paying for a sample-encode.
const REFINE_DEBOUNCE_MS = 400;

/**
 * Output-size estimate for the current file + quality. Resolves immediately to
 * an instant bits-per-pixel range, then (debounced) kicks off a backend
 * sample-encode and upgrades to an exact figure. Rapid file/quality changes are
 * race-safe: a request-id guard drops stale results, and the instant range
 * re-seeds on every change so the UI never shows a number for the wrong inputs.
 */
export function useSizeEstimate(file: FileInfo | null, quality: Quality): SizeEstimate {
  const [estimate, setEstimate] = useState<SizeEstimate>({ kind: "none" });
  // Bumped on every effect run so a resolved promise can tell whether it's still
  // the latest request before committing its result.
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;

    if (!file) {
      setEstimate({ kind: "none" });
      return;
    }

    const range = estimateSizeRange(file, quality);
    setEstimate(range ? { kind: "range", ...range } : { kind: "none" });

    const durationMs =
      file.duration != null ? Math.round(file.duration * 1000) : undefined;

    const timer = setTimeout(() => {
      filesService
        .estimateSize(file.path, quality, durationMs)
        .then((bytes) => {
          if (id === requestId.current) setEstimate({ kind: "exact", bytes });
        })
        .catch(() => {
          // Keep the instant range on failure (offline sample, ffmpeg error).
        });
    }, REFINE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [file, quality]);

  return estimate;
}
