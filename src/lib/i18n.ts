import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

export const SUPPORTED_LANGUAGES = ["en", "fr"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Map any locale string (e.g. "fr-FR") to a supported language, default "en". */
export function resolveLanguage(locale: string | undefined | null): Language {
  return locale?.toLowerCase().startsWith("fr") ? "fr" : "en";
}

// Seed from the OS locale so the first paint matches the user's language before
// the persisted setting loads; settingsContext re-applies the saved choice after.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: resolveLanguage(navigator.language),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
