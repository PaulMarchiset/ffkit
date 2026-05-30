import type { Quality } from "./types";

export interface QualityPreset {
  id: Quality;
  label: string;
  description: string;
  tooltip: string;
}

export const QUALITY_PRESETS: QualityPreset[] = [
  {
    id: "low",
    label: "Low",
    description: "Smaller file, reduced quality",
    tooltip: "CRF 30 — good for sharing or streaming where file size matters.",
  },
  {
    id: "medium",
    label: "Medium",
    description: "Balanced quality and size",
    tooltip: "CRF 23 — the ffmpeg default. Great all-around choice.",
  },
  {
    id: "lossless",
    label: "Lossless",
    description: "Near-original quality",
    tooltip:
      "CRF 18 — visually lossless H.264. Larger file. For true mathematically lossless, use Advanced mode.",
  },
];
