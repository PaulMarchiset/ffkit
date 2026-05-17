import type { FeatureTemplate } from "@/lib/ffmpeg-args";

interface Props {
  template: FeatureTemplate | null;
  values: Record<string, string>;
  onValueChange: (key: string, value: string) => void;
  onApply: () => void;
  onCancel: () => void;
}

export function PromptTemplatePanel({
  template,
  values,
  onValueChange,
  onApply,
  onCancel,
}: Props) {
  if (!template?.prompts) return null;
  return (
    <div className="rounded-[10px] border border-accent/20 bg-accent/5 p-3 flex flex-col gap-2">
      <p className="text-xs font-medium text-accent">{template.label} — parameters</p>
      <div className="grid grid-cols-2 gap-2">
        {template.prompts.map((p) => (
          <div key={p.key}>
            <label className="text-xs text-muted mb-1 block">{p.key}</label>
            <input
              type="text"
              placeholder={p.placeholder}
              value={values[p.key] ?? ""}
              onChange={(e) => onValueChange(p.key, e.target.value)}
              className="w-full px-2 py-1.5 text-sm rounded-[8px] border border-white/10 bg-[#1A1A18] text-[#E8E5DC] outline-none focus:border-accent/50 transition-colors"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onApply}
          className="px-3 py-1.5 text-xs font-medium rounded-[8px] bg-accent hover:bg-accent/85 text-white transition-colors"
        >
          Apply
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium rounded-[8px] border border-white/10 text-muted hover:text-[#E8E5DC] hover:border-white/20 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
