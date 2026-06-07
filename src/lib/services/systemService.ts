import { getVersion } from "@tauri-apps/api/app";

/**
 * The IPC seam for app/runtime metadata. Components go through this service so
 * the actual Tauri API calls live in exactly one place and stay mockable like
 * the rest of the seam (see also {@link filesService}, {@link windowService}).
 */
export const systemService = {
  /** The running application version (from tauri.conf.json). */
  appVersion: (): Promise<string> => getVersion(),
};
