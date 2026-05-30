import { open, save } from "@tauri-apps/plugin-dialog";

const VIDEO_FILTERS = [
  {
    name: "Video",
    extensions: ["mp4", "mkv", "mov", "avi", "webm", "flv", "m4v", "wmv", "ts"],
  },
];

export async function pickVideoFile(): Promise<string | null> {
  const result = await open({ filters: VIDEO_FILTERS, multiple: false });
  return typeof result === "string" ? result : null;
}

export async function pickOutputFile(defaultPath?: string): Promise<string | null> {
  const result = await save({
    defaultPath,
    filters: [{ name: "MP4 Video", extensions: ["mp4"] }],
  });
  return result ?? null;
}

export async function pickOutputFolder(): Promise<string | null> {
  const result = await open({ directory: true, multiple: false });
  return typeof result === "string" ? result : null;
}
