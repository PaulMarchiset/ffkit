import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { settingsService } from "@/lib/services/settingsService";
import i18n, { resolveLanguage } from "@/lib/i18n";
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

  // Tracks the last resolved appearance so we only animate genuine light<->dark
  // flips — not the initial hydration (index.html already ships `.dark`).
  const prevDarkRef = useRef<boolean | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply the color theme to <html> (the CSS keys off `.light` / `.dark`).
  // "system" follows the OS and updates live when it changes. Waits for settings
  // to load (index.html holds `.dark` until then, so no flash).
  useEffect(() => {
    if (!settings) return;
    const theme = settings.theme;
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      // Briefly enable color transitions only for an actual flip, then remove
      // the class so everyday interactions stay instant (see styles.css).
      if (prevDarkRef.current !== null && prevDarkRef.current !== dark) {
        root.classList.add("theme-transition");
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = setTimeout(
          () => root.classList.remove("theme-transition"),
          250,
        );
      }
      prevDarkRef.current = dark;
      root.classList.toggle("dark", dark);
      root.classList.toggle("light", !dark);
    };
    apply();
    if (theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [settings]);

  // Apply the saved UI language. "system" follows the OS locale; otherwise force
  // the chosen language.
  useEffect(() => {
    const pref = settings?.language ?? "system";
    const resolved = pref === "system" ? resolveLanguage(navigator.language) : pref;
    if (i18n.language !== resolved) i18n.changeLanguage(resolved);
  }, [settings?.language]);

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
