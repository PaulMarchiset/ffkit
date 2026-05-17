export const PHASE_WORDS = {
  analysis: [
    "Probing", "Inspecting", "Scanning", "Reading", "Parsing",
    "Sniffing", "Examining", "Surveying", "Demuxing", "Decoding",
    "Detecting", "Identifying", "Measuring",
  ],
  planning: [
    "Planning", "Choosing", "Selecting", "Mapping", "Routing",
    "Configuring", "Preparing", "Calibrating", "Negotiating",
  ],
  encoding: [
    "Encoding", "Transcoding", "Processing", "Crunching", "Compressing",
    "Rendering", "Computing", "Working", "Running", "Churning", "Grinding",
    "Cooking", "Chewing", "Munching",
    "Filtering", "Scaling", "Resampling", "Resizing", "Cropping",
    "Trimming", "Stretching", "Sharpening", "Denoising", "Deinterlacing",
    "Interpolating", "Quantizing", "Sampling", "Buffering", "Streaming",
    "Threading", "Piping", "Flowing",
    "Mixing", "Remixing", "Normalizing", "Syncing", "Aligning", "Dithering",
    "Muxing", "Remuxing", "Packaging", "Containing", "Assembling",
    "Stitching", "Merging", "Concatenating",
    "Brewing", "Wrangling", "Coaxing", "Massaging", "Nudging",
    "Tinkering", "Whispering", "Persuading", "Hustling", "Shuffling",
  ],
  finishing: [
    "Finalizing", "Flushing", "Sealing", "Writing", "Saving",
    "Verifying", "Validating", "Checking", "Polishing", "Closing",
  ],
};

export function getPhasePool(pct: number): string[] {
  if (pct < 3) return PHASE_WORDS.analysis;
  if (pct < 10) return PHASE_WORDS.planning;
  if (pct >= 93) return PHASE_WORDS.finishing;
  return PHASE_WORDS.encoding;
}
