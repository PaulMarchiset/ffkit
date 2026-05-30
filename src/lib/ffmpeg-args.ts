export const CATEGORIES = ["Compress", "Convert", "Resize", "Extract", "Edit"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface FeatureTemplate {
  id: string;
  label: string;
  command: string;
  category: Category;
  /** Fields that need extra user input before use */
  prompts?: Array<{ key: string; placeholder: string }>;
}

export const DEFAULT_TEMPLATE_ID = "compress-h264";

export const FEATURE_TEMPLATES: FeatureTemplate[] = [
  {
    id: DEFAULT_TEMPLATE_ID,
    label: "H.264",
    category: "Compress",
    command: "ffmpeg -i {input} -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k {output}",
  },
  {
    id: "compress-h265",
    label: "H.265",
    category: "Compress",
    command: "ffmpeg -i {input} -c:v libx265 -crf 28 -preset medium -c:a aac -b:a 128k {output}",
  },
  {
    id: "to-mp4",
    label: "to MP4",
    category: "Convert",
    command: "ffmpeg -i {input} -c:v libx264 -c:a aac {output}",
  },
  {
    id: "to-webm",
    label: "to WebM (VP9)",
    category: "Convert",
    command:
      "ffmpeg -i {input} -c:v libvpx-vp9 -crf 32 -b:v 0 -c:a libopus -b:a 96k {output}",
  },
  {
    id: "to-mov",
    label: "to MOV",
    category: "Convert",
    command: "ffmpeg -i {input} -c:v libx264 -c:a aac {output}",
  },
  {
    id: "resize-1080p",
    label: "1080p",
    category: "Resize",
    command:
      "ffmpeg -i {input} -vf scale=-2:1080 -c:v libx264 -crf 23 -c:a copy {output}",
  },
  {
    id: "resize-720p",
    label: "720p",
    category: "Resize",
    command:
      "ffmpeg -i {input} -vf scale=-2:720 -c:v libx264 -crf 23 -c:a copy {output}",
  },
  {
    id: "resize-480p",
    label: "480p",
    category: "Resize",
    command:
      "ffmpeg -i {input} -vf scale=-2:480 -c:v libx264 -crf 23 -c:a copy {output}",
  },
  {
    id: "audio-mp3",
    label: "Audio MP3",
    category: "Extract",
    command: "ffmpeg -i {input} -vn -c:a libmp3lame -b:a 192k {output}",
  },
  {
    id: "audio-wav",
    label: "Audio WAV",
    category: "Extract",
    command: "ffmpeg -i {input} -vn -c:a pcm_s16le {output}",
  },
  {
    id: "strip-audio",
    label: "Strip audio",
    category: "Extract",
    command: "ffmpeg -i {input} -an -c:v copy {output}",
  },
  {
    id: "strip-video",
    label: "Strip video",
    category: "Extract",
    command: "ffmpeg -i {input} -vn -c:a copy {output}",
  },
  {
    id: "trim",
    label: "Trim",
    category: "Edit",
    command:
      "ffmpeg -i {input} -ss {start} -to {end} -c copy {output}",
    prompts: [
      { key: "start", placeholder: "00:00:10" },
      { key: "end", placeholder: "00:01:00" },
    ],
  },
  {
    id: "framerate",
    label: "Framerate",
    category: "Edit",
    command: "ffmpeg -i {input} -vf fps={fps} -c:v libx264 -c:a copy {output}",
    prompts: [{ key: "fps", placeholder: "30" }],
  },
  {
    id: "gif",
    label: "GIF",
    category: "Edit",
    command:
      "ffmpeg -i {input} -vf fps={fps},scale={width}:-1:flags=lanczos -c:v gif {output}",
    prompts: [
      { key: "fps", placeholder: "15" },
      { key: "width", placeholder: "480" },
    ],
  },
];

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
