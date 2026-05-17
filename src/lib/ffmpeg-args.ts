export interface FeatureTemplate {
  id: string;
  label: string;
  command: string;
  /** Fields that need extra user input before use */
  prompts?: Array<{ key: string; placeholder: string }>;
}

export const FEATURE_TEMPLATES: FeatureTemplate[] = [
  {
    id: "compress-h264",
    label: "Compress (H.264)",
    command: "ffmpeg -i {input} -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k {output}",
  },
  {
    id: "compress-h265",
    label: "Compress (H.265)",
    command: "ffmpeg -i {input} -c:v libx265 -crf 28 -preset medium -c:a aac -b:a 128k {output}",
  },
  {
    id: "to-mp4",
    label: "Convert to MP4",
    command: "ffmpeg -i {input} -c:v libx264 -c:a aac {output}",
  },
  {
    id: "to-webm",
    label: "Convert to WebM (VP9)",
    command:
      "ffmpeg -i {input} -c:v libvpx-vp9 -crf 32 -b:v 0 -c:a libopus -b:a 96k {output}",
  },
  {
    id: "to-mov",
    label: "Convert to MOV",
    command: "ffmpeg -i {input} -c:v libx264 -c:a aac {output}",
  },
  {
    id: "audio-mp3",
    label: "Extract audio (MP3)",
    command: "ffmpeg -i {input} -vn -c:a libmp3lame -b:a 192k {output}",
  },
  {
    id: "audio-wav",
    label: "Extract audio (WAV)",
    command: "ffmpeg -i {input} -vn -c:a pcm_s16le {output}",
  },
  {
    id: "trim",
    label: "Trim",
    command:
      "ffmpeg -i {input} -ss {start} -to {end} -c copy {output}",
    prompts: [
      { key: "start", placeholder: "00:00:10" },
      { key: "end", placeholder: "00:01:00" },
    ],
  },
  {
    id: "resize-1080p",
    label: "Resize to 1080p",
    command:
      "ffmpeg -i {input} -vf scale=-2:1080 -c:v libx264 -crf 23 -c:a copy {output}",
  },
  {
    id: "resize-720p",
    label: "Resize to 720p",
    command:
      "ffmpeg -i {input} -vf scale=-2:720 -c:v libx264 -crf 23 -c:a copy {output}",
  },
  {
    id: "resize-480p",
    label: "Resize to 480p",
    command:
      "ffmpeg -i {input} -vf scale=-2:480 -c:v libx264 -crf 23 -c:a copy {output}",
  },
  {
    id: "framerate",
    label: "Change framerate",
    command: "ffmpeg -i {input} -vf fps={fps} -c:v libx264 -c:a copy {output}",
    prompts: [{ key: "fps", placeholder: "30" }],
  },
  {
    id: "gif",
    label: "Make GIF",
    command:
      "ffmpeg -i {input} -vf fps={fps},scale={width}:-1:flags=lanczos -c:v gif {output}",
    prompts: [
      { key: "fps", placeholder: "15" },
      { key: "width", placeholder: "480" },
    ],
  },
  {
    id: "strip-audio",
    label: "Strip audio",
    command: "ffmpeg -i {input} -an -c:v copy {output}",
  },
  {
    id: "strip-video",
    label: "Strip video",
    command: "ffmpeg -i {input} -vn -c:a copy {output}",
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
