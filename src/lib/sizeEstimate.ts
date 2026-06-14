import type { FileInfo, Quality } from "@/lib/types";

export interface SizeRange {
  min: number;
  max: number;
}

// Rough bits-per-pixel-per-frame for H.264 at each preset's CRF. CRF is constant
// *quality*, so true bitrate swings with footage complexity — these are midpoints
// of a wide spread, only meant to seed an instant placeholder range before the
// sample-encode refines it (see useSizeEstimate / estimate_output_size).
const VIDEO_BPP: Record<Quality, number> = {
  low: 0.04,
  medium: 0.09,
  lossless: 0.18,
};

// Audio is encoded at a fixed bitrate per preset (see preset_args in Rust), so
// this part of the estimate is reliable.
const AUDIO_BPS: Record<Quality, number> = {
  low: 96_000,
  medium: 128_000,
  lossless: 192_000,
};

// Fallbacks for fields ffprobe may not report, so the range is still sensible.
const DEFAULT_FPS = 30;
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

// Half-width of the band around the central estimate (±50%), reflecting how
// loose a CRF guess is. Floor keeps tiny clips from showing a degenerate range.
const BAND = 0.5;

/**
 * Instant, content-blind size estimate from a bits-per-pixel model. Returned as
 * a wide range because CRF output size genuinely can't be pinned down without
 * encoding. Used as a placeholder until the backend sample-encode lands.
 */
export function estimateSizeRange(file: FileInfo, quality: Quality): SizeRange | null {
  const duration = file.duration;
  if (!duration || duration <= 0) return null;

  const width = file.width || DEFAULT_WIDTH;
  const height = file.height || DEFAULT_HEIGHT;
  const fps = file.fps || DEFAULT_FPS;

  const videoBitsPerSec = VIDEO_BPP[quality] * width * height * fps;
  const totalBitsPerSec = videoBitsPerSec + AUDIO_BPS[quality];
  const center = (totalBitsPerSec * duration) / 8; // bytes

  return {
    min: Math.round(center * (1 - BAND)),
    max: Math.round(center * (1 + BAND)),
  };
}

/**
 * Single-number instant estimate (the centre of {@link estimateSizeRange}).
 * Used in the multi-file list, where firing a sample-encode per row would spawn
 * a storm of ffmpeg processes just from browsing — the real measured size still
 * lands per job once a conversion runs.
 */
export function estimateSizeCenter(file: FileInfo, quality: Quality): number | null {
  const range = estimateSizeRange(file, quality);
  return range ? Math.round((range.min + range.max) / 2) : null;
}
