import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

/**
 * The IPC seam for OS notifications (via tauri-plugin-notification). Lazily
 * requests permission on first use and silently no-ops if the user denied it,
 * so callers can fire-and-forget without guarding.
 */
export const notificationsService = {
  async notify(title: string, body: string): Promise<void> {
    try {
      let granted = await isPermissionGranted();
      if (!granted) {
        granted = (await requestPermission()) === "granted";
      }
      if (granted) sendNotification({ title, body });
    } catch {
      // Notifications are best-effort; never let them break the job flow.
    }
  },
};
