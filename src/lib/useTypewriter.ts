import { useEffect, useRef, useState } from "react";

const DWELL_MS = 2800;
const MIN_CHAR_MS = 45;
const TOTAL_TYPING_MS = 750;

interface Options {
  enabled?: boolean;
}

/**
 * Cycles the displayed word by typing the next word over the current one,
 * one character at a time, then pausing before picking the next.
 *
 * `pickNext` is read on each cycle, so callers may close over changing state.
 */
export function useTypewriter(
  initialWord: string,
  pickNext: () => string,
  { enabled = true }: Options = {},
): string {
  const [displayed, setDisplayed] = useState(initialWord);
  const currentRef = useRef(initialWord);
  const pickNextRef = useRef(pickNext);
  pickNextRef.current = pickNext;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let typingTimer: ReturnType<typeof setInterval> | null = null;
    let waitTimer: ReturnType<typeof setTimeout> | null = null;

    const showNext = () => {
      if (cancelled) return;
      const next = pickNextRef.current();
      const current = currentRef.current;
      const steps = Math.max(next.length, current.length);
      const charDelay = Math.max(MIN_CHAR_MS, TOTAL_TYPING_MS / steps);

      let i = 0;
      typingTimer = setInterval(() => {
        if (cancelled) {
          clearInterval(typingTimer!);
          return;
        }
        i++;
        setDisplayed(next.slice(0, i) + current.slice(i));
        if (i >= steps) {
          clearInterval(typingTimer!);
          currentRef.current = next;
          setDisplayed(next);
          waitTimer = setTimeout(showNext, DWELL_MS);
        }
      }, charDelay);
    };

    waitTimer = setTimeout(showNext, DWELL_MS);

    return () => {
      cancelled = true;
      if (typingTimer) clearInterval(typingTimer);
      if (waitTimer) clearTimeout(waitTimer);
    };
  }, [enabled]);

  return displayed;
}
