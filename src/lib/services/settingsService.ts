import { getSettings, setSettings } from "@/lib/tauri";
import type { Settings } from "@/lib/types";

/**
 * The persistence seam for app settings. Everything that needs to read or
 * write settings goes through the SettingsContext, which in turn goes through
 * this service — so the actual IPC calls live in exactly one place.
 */
export const settingsService = {
  load: (): Promise<Settings> => getSettings(),
  save: (settings: Settings): Promise<void> => setSettings(settings),
};
