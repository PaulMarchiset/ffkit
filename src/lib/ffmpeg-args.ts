export const CATEGORIES = ["Compress", "Convert", "Resize", "Extract", "Edit"] as const;
export type Category = (typeof CATEGORIES)[number];

/** A single user-supplied parameter substituted into a template command. */
export interface PromptField {
  /** Placeholder name in the command, e.g. "fps" for `{fps}`. */
  key: string;
  /** Human label shown above the control, e.g. "Frames per second". */
  label: string;
  /** Example value; also seeded as the field's default so the command is
   *  immediately complete. */
  placeholder: string;
  /** Optional unit suffix rendered inside the input (e.g. "fps", "px"). */
  unit?: string;
  /** Quick-pick values rendered as chips below a numeric field. */
  presets?: string[];
}

export interface FeatureTemplate {
  id: string;
  label: string;
  command: string;
  category: Category;
  /**
   * Output container extension this template actually produces (no leading dot).
   * This is the single source of truth for the output file's extension: ffmpeg
   * picks the muxer from the output filename, so the name must match the format
   * the command encodes. Copy/passthrough templates that don't transcode the
   * container keep "mp4" to preserve existing behavior — see notes below.
   */
  ext: string;
  /** Fields that need extra user input before use */
  prompts?: PromptField[];
  /**
   * How the prompt fields are presented. "fields" (default) renders labeled
   * numeric inputs with preset chips; "timeRange" renders the Trim selection
   * timeline (waveform + draggable start/end handles). The timeRange UI expects
   * exactly a `start` and an `end` prompt holding "HH:MM:SS" timecodes.
   */
  promptUi?: "fields" | "timeRange";
}

export const DEFAULT_TEMPLATE_ID = "compress-h264";

export const FEATURE_TEMPLATES: FeatureTemplate[] = [
  {
    id: DEFAULT_TEMPLATE_ID,
    label: "H.264",
    category: "Compress",
    command: "ffmpeg -i {input} -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k {output}",
    ext: "mp4",
  },
  {
    id: "compress-h265",
    label: "H.265",
    category: "Compress",
    command: "ffmpeg -i {input} -c:v libx265 -crf 28 -preset medium -c:a aac -b:a 128k {output}",
    ext: "mp4",
  },
  {
    id: "to-mp4",
    label: "to MP4",
    category: "Convert",
    command: "ffmpeg -i {input} -c:v libx264 -c:a aac {output}",
    ext: "mp4",
  },
  {
    id: "to-webm",
    label: "to WebM (VP9)",
    category: "Convert",
    command:
      "ffmpeg -i {input} -c:v libvpx-vp9 -crf 32 -b:v 0 -c:a libopus -b:a 96k {output}",
    ext: "webm",
  },
  {
    id: "to-mov",
    label: "to MOV",
    category: "Convert",
    command: "ffmpeg -i {input} -c:v libx264 -c:a aac {output}",
    ext: "mov",
  },
  {
    id: "resize-1080p",
    label: "1080p",
    category: "Resize",
    command:
      "ffmpeg -i {input} -vf scale=-2:1080 -c:v libx264 -crf 23 -c:a copy {output}",
    ext: "mp4",
  },
  {
    id: "resize-720p",
    label: "720p",
    category: "Resize",
    command:
      "ffmpeg -i {input} -vf scale=-2:720 -c:v libx264 -crf 23 -c:a copy {output}",
    ext: "mp4",
  },
  {
    id: "resize-480p",
    label: "480p",
    category: "Resize",
    command:
      "ffmpeg -i {input} -vf scale=-2:480 -c:v libx264 -crf 23 -c:a copy {output}",
    ext: "mp4",
  },
  {
    id: "audio-mp3",
    label: "Audio MP3",
    category: "Extract",
    command: "ffmpeg -i {input} -vn -c:a libmp3lame -b:a 192k {output}",
    ext: "mp3",
  },
  {
    id: "audio-wav",
    label: "Audio WAV",
    category: "Extract",
    command: "ffmpeg -i {input} -vn -c:a pcm_s16le {output}",
    ext: "wav",
  },
  {
    // Copy-passthrough: drops the audio, copies the video stream. Output stays
    // mp4 (matches prior behavior); a fully format-aware choice would follow the
    // source container — see report's "ambiguous" note.
    id: "strip-audio",
    label: "Strip audio",
    category: "Extract",
    command: "ffmpeg -i {input} -an -c:v copy {output}",
    ext: "mp4",
  },
  {
    // Copy-passthrough: drops the video, copies the audio stream. Output stays
    // mp4 (matches prior behavior); see report's "ambiguous" note.
    id: "strip-video",
    label: "Strip video",
    category: "Extract",
    command: "ffmpeg -i {input} -vn -c:a copy {output}",
    ext: "mp4",
  },
  {
    // Copy-passthrough trim (-c copy). Output stays mp4 (matches prior behavior);
    // a format-aware choice would follow the source container — see report's note.
    id: "trim",
    label: "Trim",
    category: "Edit",
    command:
      "ffmpeg -i {input} -ss {start} -to {end} -c copy {output}",
    ext: "mp4",
    promptUi: "timeRange",
    prompts: [
      { key: "start", label: "Start", placeholder: "00:00:10" },
      { key: "end", label: "End", placeholder: "00:01:00" },
    ],
  },
  {
    id: "framerate",
    label: "Framerate",
    category: "Edit",
    command: "ffmpeg -i {input} -vf fps={fps} -c:v libx264 -c:a copy {output}",
    ext: "mp4",
    prompts: [
      {
        key: "fps",
        label: "Frames per second",
        placeholder: "30",
        unit: "fps",
        presets: ["24", "30", "60"],
      },
    ],
  },
  {
    id: "gif",
    label: "GIF",
    category: "Edit",
    command:
      "ffmpeg -i {input} -vf fps={fps},scale={width}:-1:flags=lanczos -c:v gif {output}",
    ext: "gif",
    prompts: [
      {
        key: "fps",
        label: "Frames per second",
        placeholder: "10",
        unit: "fps",
        presets: ["10", "15", "24"],
      },
      {
        key: "width",
        label: "Width",
        placeholder: "320",
        unit: "px",
        presets: ["320", "480", "600"],
      },
    ],
  },
];

/** Seed the default value for each prompt (its placeholder doubles as default),
 *  so a freshly selected template yields a fully substituted command. */
export function defaultPromptValues(t: FeatureTemplate): Record<string, string> {
  const values: Record<string, string> = {};
  (t.prompts ?? []).forEach((p) => (values[p.key] = p.placeholder));
  return values;
}

/** Apply user-supplied prompt values to a template command. */
export function applyPromptValues(
  template: string,
  values: Record<string, string>,
): string {
  let result = template;
  for (const [key, val] of Object.entries(values)) {
    result = result.split(`{${key}}`).join(val);
  }
  return result;
}

export function defaultCommandTemplate(): string {
  const tpl = FEATURE_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID);
  if (!tpl) throw new Error(`Missing default template '${DEFAULT_TEMPLATE_ID}'`);
  return tpl.command;
}

/** Output extension matching {@link defaultCommandTemplate} (currently "mp4"). */
export function defaultTemplateExt(): string {
  const tpl = FEATURE_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID);
  if (!tpl) throw new Error(`Missing default template '${DEFAULT_TEMPLATE_ID}'`);
  return tpl.ext;
}
