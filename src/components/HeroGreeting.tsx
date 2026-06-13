import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTypewriter } from "@/lib/useTypewriter";
import { useSettings } from "@/lib/settingsContext";

export function HeroGreeting() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  // Default to animating until settings have loaded.
  const animate = settings?.animateGreeting ?? true;

  // Verbs are localized; the last one ("ffmpeg") is the static fallback.
  const verbs = t("hero.verbs", { returnObjects: true }) as string[];

  const idxRef = useRef(1);
  const verb = useTypewriter(
    verbs[0],
    () => {
      const next = verbs[idxRef.current % verbs.length];
      idxRef.current++;
      return next;
    },
    { enabled: animate },
  );

  return (
    <h1 className="font-serif text-5xl text-fg text-center leading-tight tracking-tight">
      {t("hero.greetingPrefix")}
      <span className="text-accent">{animate ? verb : "ffmpeg"}</span>
      {t("hero.greetingSuffix")}
    </h1>
  );
}
