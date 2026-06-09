import type { FeatureTemplate } from "@/lib/ffmpeg-args";
import type { FileInfo } from "@/lib/types";
import { NumberPresetField } from "./NumberPresetField";
import { TrimSelector } from "./TrimSelector";

interface Props {
  template: FeatureTemplate | null;
  values: Record<string, string>;
  onValueChange: (key: string, value: string) => void;
  inputFile: FileInfo | null;
}

/**
 * Renders the active feature's parameter controls. Values are applied live to
 * the command (there is no Apply step). Dispatches on `promptUi`: the Trim
 * timeline for "timeRange", labeled numeric fields with preset chips otherwise.
 */
export function PromptTemplatePanel({
  template,
  values,
  onValueChange,
  inputFile,
}: Props) {
  if (!template?.prompts || template.prompts.length === 0) return null;

  const content =
    template.promptUi === "timeRange" ? (
      <TrimSelector
        inputFile={inputFile}
        startValue={values.start ?? ""}
        endValue={values.end ?? ""}
        onChange={onValueChange}
      />
    ) : (
      <div className="grid grid-cols-2 gap-4">
        {template.prompts.map((field) => (
          <NumberPresetField
            key={field.key}
            field={field}
            value={values[field.key] ?? ""}
            onChange={(v) => onValueChange(field.key, v)}
          />
        ))}
      </div>
    );

  // Extra breathing room between the command editor's help text and the
  // parameter controls (on top of AdvancedMode's gap-3).
  return <div className="mt-4">{content}</div>;
}
