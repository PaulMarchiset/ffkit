import { useRef } from "react";
import { useTypewriter } from "@/lib/useTypewriter";
import { useSettings } from "@/lib/settingsContext";

const VERBS = ["compress", "trim", "convert", "resize", "extract", "transcode", "ffmpeg"];

export function HeroGreeting() {
  const { settings } = useSettings();
  // Default to animating until settings have loaded.
  const animate = settings?.animateGreeting ?? true;

  const idxRef = useRef(1);
  const verb = useTypewriter(
    VERBS[0],
    () => {
      const next = VERBS[idxRef.current % VERBS.length];
      idxRef.current++;
      return next;
    },
    { enabled: animate },
  );

  return (
    <h1 className="font-serif text-5xl text-fg text-center leading-tight tracking-tight">
      Hello, ready to{" "}
      <span className="text-accent">{animate ? verb : "ffmpeg"}</span>?
    </h1>
  );
}
