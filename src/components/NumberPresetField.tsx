import { cn } from "@/lib/cn";
import type { PromptField } from "@/lib/ffmpeg-args";

interface Props {
  field: PromptField;
  value: string;
  onChange: (value: string) => void;
}

/**
 * A labeled numeric parameter: a large input with an in-field unit suffix and
 * a row of quick-pick preset chips. Used for the Framerate / GIF controls.
 */
export function NumberPresetField({ field, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-muted">{field.label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 pr-12 rounded-[10px] border border-border-soft bg-surface-2 text-fg font-mono text-base outline-none focus:border-accent/40 transition-colors"
        />
        {field.unit && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted select-none pointer-events-none">
            {field.unit}
          </span>
        )}
      </div>
      {field.presets && field.presets.length > 0 && (
        <div className="flex gap-2">
          {field.presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className={cn(
                "inline-flex items-center justify-center h-8 px-3 rounded-[8px] text-sm font-mono transition-colors",
                value === preset
                  ? "bg-surface-2 text-fg"
                  : "text-muted ring-1 ring-inset ring-border-soft hover:text-fg hover:ring-border-hover",
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
