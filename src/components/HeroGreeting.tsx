import { useRef } from "react";
import { useTypewriter } from "@/lib/useTypewriter";

const VERBS = ["compress", "trim", "convert", "resize", "extract", "transcode", "ffmpeg"];

export function HeroGreeting() {
  const idxRef = useRef(1);
  const verb = useTypewriter(VERBS[0], () => {
    const next = VERBS[idxRef.current % VERBS.length];
    idxRef.current++;
    return next;
  });

  return (
    <h1 className="font-serif text-5xl text-fg text-center leading-tight tracking-tight">
      Hello, ready to <span className="text-accent">{verb}</span>?
    </h1>
  );
}
