import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  FEATURE_TEMPLATES,
  applyPromptValues,
  type FeatureTemplate,
} from "@/lib/ffmpeg-args";

interface Props {
  onSelect: (command: string, template: FeatureTemplate) => void;
}

export function FeatureButtons({ onSelect }: Props) {
  const [pendingTemplate, setPendingTemplate] = useState<FeatureTemplate | null>(null);
  const [promptValues, setPromptValues] = useState<Record<string, string>>({});

  function handleClick(t: FeatureTemplate) {
    if (t.prompts && t.prompts.length > 0) {
      setPendingTemplate(t);
      const defaults: Record<string, string> = {};
      t.prompts.forEach((p) => (defaults[p.key] = ""));
      setPromptValues(defaults);
    } else {
      onSelect(t.command, t);
    }
  }

  function handlePromptSubmit() {
    if (!pendingTemplate) return;
    const cmd = applyPromptValues(pendingTemplate.command, promptValues);
    onSelect(cmd, pendingTemplate);
    setPendingTemplate(null);
    setPromptValues({});
  }

  return (
    <div className="flex flex-col gap-0.5">
      {FEATURE_TEMPLATES.map((t) => (
        <button
          key={t.id}
          onClick={() => handleClick(t)}
          className={cn(
            "text-left px-2.5 py-1.5 rounded-[8px] text-sm transition-colors",
            "text-subtle hover:text-[#E8E5DC] hover:bg-white/5",
          )}
        >
          {t.label}
        </button>
      ))}

      {pendingTemplate && (
        <div className="mt-2 p-3 rounded-[10px] border border-accent/20 bg-accent/5">
          <p className="text-xs font-medium text-accent mb-2">
            {pendingTemplate.label}
          </p>
          {pendingTemplate.prompts!.map((p) => (
            <div key={p.key} className="mb-2">
              <label className="text-xs text-muted mb-1 block">
                {p.key}
              </label>
              <input
                type="text"
                placeholder={p.placeholder}
                value={promptValues[p.key] ?? ""}
                onChange={(e) =>
                  setPromptValues((prev) => ({ ...prev, [p.key]: e.target.value }))
                }
                className="w-full px-2 py-1 text-sm rounded-[8px] border border-white/10 bg-[#1A1A18] text-[#E8E5DC] outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handlePromptSubmit}
              className="px-3 py-1.5 text-xs font-medium rounded-[8px] bg-accent hover:bg-accent/85 text-white transition-colors"
            >
              Apply
            </button>
            <button
              onClick={() => setPendingTemplate(null)}
              className="px-3 py-1.5 text-xs font-medium rounded-[8px] border border-white/10 text-muted hover:text-[#E8E5DC] hover:border-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
