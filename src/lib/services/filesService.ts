import {
  estimateOutputSize,
  extractWaveform,
  openPath,
  openUrl,
  probeFile,
} from "@/lib/tauri";
import type { FileInfo, Quality } from "@/lib/types";

/**
 * The IPC seam for filesystem / shell interactions: probing an input file for
 * metadata and revealing paths or URLs in the OS. Components go through this
 * service so the actual Tauri calls live in exactly one place (see also
 * {@link jobsService}, {@link settingsService}).
 */
export const filesService = {
  probe: (path: string): Promise<FileInfo> => probeFile(path),
  /**
   * Estimated output size (bytes) for a preset conversion. The backend
   * sample-encodes a short slice and extrapolates — accurate but takes a couple
   * of seconds; see {@link estimateSizeRange} for the instant heuristic range.
   */
  estimateSize: (
    path: string,
    quality: Quality,
    totalDurationMs?: number,
  ): Promise<number> => estimateOutputSize(path, quality, totalDurationMs),
  /** Normalized audio peak amplitudes (0..1) for waveform rendering. */
  waveform: (path: string, buckets: number): Promise<number[]> =>
    extractWaveform(path, buckets),
  openPath: (path: string): Promise<void> => openPath(path),
  openUrl: (url: string): Promise<void> => openUrl(url),
};
