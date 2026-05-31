import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/**
 * The IPC seam for in-place auto-updates. The updater plugin checks the
 * configured endpoint (see tauri.conf.json), verifies the download's Ed25519
 * signature against the embedded public key, installs in place, and we then
 * relaunch. UI goes through this service so the plugin calls live in one place
 * (see also {@link filesService}, {@link settingsService}).
 */
export const updaterService = {
  /** Returns the pending update, or null when already up to date. */
  check: (): Promise<Update | null> => check(),

  /**
   * Download + install the given update in place, reporting download progress
   * (0–1) through the optional callback, then relaunch into the new version.
   */
  async install(update: Update, onProgress?: (fraction: number) => void): Promise<void> {
    let downloaded = 0;
    let total = 0;
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          total = event.data.contentLength ?? 0;
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          if (onProgress && total > 0) onProgress(downloaded / total);
          break;
        case "Finished":
          if (onProgress) onProgress(1);
          break;
      }
    });
    await relaunch();
  },
};
