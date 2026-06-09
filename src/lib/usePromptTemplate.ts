import { useState } from "react";
import {
  applyPromptValues,
  defaultPromptValues,
  type FeatureTemplate,
} from "@/lib/ffmpeg-args";

export interface PromptTemplateState {
  pending: FeatureTemplate | null;
  values: Record<string, string>;
  /** Begin editing a template's parameters, seeding defaults. */
  start(template: FeatureTemplate): void;
  setValue(key: string, value: string): void;
  /** The template command with the current values substituted in. */
  resolve(): string | null;
  cancel(): void;
}

/**
 * Holds the active feature template and its live parameter values. Values are
 * seeded from each field's placeholder so the resolved command is complete the
 * moment a template is selected — the parameter controls then drive the command
 * editor in real time (there is no separate "apply" step).
 */
export function usePromptTemplate(): PromptTemplateState {
  const [pending, setPending] = useState<FeatureTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  return {
    pending,
    values,
    start(template) {
      setPending(template);
      setValues(defaultPromptValues(template));
    },
    setValue(key, value) {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    resolve() {
      if (!pending) return null;
      return applyPromptValues(pending.command, values);
    },
    cancel() {
      setPending(null);
      setValues({});
    },
  };
}
