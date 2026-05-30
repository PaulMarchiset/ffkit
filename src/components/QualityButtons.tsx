import { cn } from "@/lib/cn";
import { QUALITY_PRESETS, type QualityPreset } from "@/lib/presets";
import type { Quality } from "@/lib/types";
import { FeatherIcon, LuggageIcon, DiamondIcon } from "./icons/QualityIcons";

interface Props {
  value: Quality;
  onChange: (q: Quality) => void;
}

const PRESET_ICONS: Record<Quality, React.ReactNode> = {
  low: <FeatherIcon />,
  medium: <LuggageIcon />,
  lossless: <DiamondIcon />,
};

export function QualityButtons({ value, onChange }: Props) {
  return (
    <div className="flex items-center justify-center gap-2">
      {QUALITY_PRESETS.map((preset) => (
        <QualityPill
          key={preset.id}
          preset={preset}
          selected={value === preset.id}
          onSelect={() => onChange(preset.id)}
        />
      ))}
    </div>
  );
}

interface PillProps {
  preset: QualityPreset;
  selected: boolean;
  onSelect: () => void;
}

function QualityPill({ preset, selected, onSelect }: PillProps) {
  return (
    <button
      onClick={onSelect}
      title={preset.tooltip}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-[10px] border text-sm transition-all",
        selected
          ? "border-accent/60 text-fg bg-accent/10"
          : "border-border text-subtle hover:border-border-hover hover:text-fg bg-transparent",
      )}
    >
      <span
        className={cn(
          "flex-shrink-0 transition-colors",
          selected ? "text-accent" : "text-subtle",
        )}
      >
        {PRESET_ICONS[preset.id]}
      </span>
      {preset.label}
    </button>
  );
}
