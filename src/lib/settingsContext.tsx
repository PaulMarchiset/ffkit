import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { settingsService } from "@/lib/services/settingsService";
import type { Settings } from "@/lib/types";

interface SettingsContextValue {
  /** Canonical persisted settings, or `null` until the first load resolves. */
  settings: Settings | null;
  /** Persist `next` and make it the new canonical value. */
  saveSettings: (next: Settings) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Single source of truth for app settings. Loads once on mount and holds the
 * canonical value; consumers read `settings` and persist through
 * `saveSettings` rather than touching the IPC layer directly.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    settingsService.load().then(setSettings);
  }, []);

  async function saveSettings(next: Settings) {
    await settingsService.save(next);
    setSettings(next);
  }

  return (
    <SettingsContext.Provider value={{ settings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
