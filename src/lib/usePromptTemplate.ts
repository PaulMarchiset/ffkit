import { useState } from "react";
import { applyPromptValues, type FeatureTemplate } from "@/lib/ffmpeg-args";

export interface PromptTemplateState {
  pending: FeatureTemplate | null;
  values: Record<string, string>;
  start(template: FeatureTemplate): void;
  setValue(key: string, value: string): void;
  apply(): string | null;
  cancel(): void;
}

/**
 * Manages the "feature template → optional prompt fields → resolved command"
 * state machine. Returns a non-null command from `apply()` when prompts are
 * filled; returns null otherwise (caller should bail out).
 */
export function usePromptTemplate(): PromptTemplateState {
  const [pending, setPending] = useState<FeatureTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  return {
    pending,
    values,
    start(template) {
      const defaults: Record<string, string> = {};
      (template.prompts ?? []).forEach((p) => (defaults[p.key] = ""));
      setPending(template);
      setValues(defaults);
    },
    setValue(key, value) {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    apply() {
      if (!pending) return null;
      const filled = applyPromptValues(pending.command, values);
      setPending(null);
      setValues({});
      return filled;
    },
    cancel() {
      setPending(null);
      setValues({});
    },
  };
}
