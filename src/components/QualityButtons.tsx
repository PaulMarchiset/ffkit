import { cn } from "@/lib/utils";
import { QUALITY_PRESETS, type QualityPreset } from "@/lib/presets";
import type { Quality } from "@/lib/tauri";

interface Props {
  value: Quality;
  onChange: (q: Quality) => void;
}

function FeatherIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 8.00001L2 22M18 15H9M6.6 19H13.3373C13.5818 19 13.7041 19 13.8192 18.9724C13.9213 18.9479 14.0188 18.9075 14.1083 18.8526C14.2092 18.7908 14.2957 18.7043 14.4686 18.5314L19.5 13.5C19.739 13.261 19.8584 13.1416 19.9546 13.0358C22.0348 10.7473 22.0348 7.25269 19.9546 4.96424C19.8584 4.85845 19.739 4.73897 19.5 4.50001C19.261 4.26105 19.1416 4.14157 19.0358 4.04541C16.7473 1.96525 13.2527 1.96525 10.9642 4.04541C10.8584 4.14157 10.739 4.26105 10.5 4.50001L5.46863 9.53138C5.29568 9.70433 5.2092 9.79081 5.14736 9.89172C5.09253 9.9812 5.05213 10.0787 5.02763 10.1808C5 10.2959 5 10.4182 5 10.6628V17.4C5 17.9601 5 18.2401 5.10899 18.454C5.20487 18.6422 5.35785 18.7951 5.54601 18.891C5.75992 19 6.03995 19 6.6 19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function LuggageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 21V7C8 6.07003 8 5.60504 8.10222 5.22354C8.37962 4.18827 9.18827 3.37962 10.2235 3.10222C10.605 3 11.07 3 12 3C12.93 3 13.395 3 13.7765 3.10222C14.8117 3.37962 15.6204 4.18827 15.8978 5.22354C16 5.60504 16 6.07003 16 7V21M5.2 21H18.8C19.9201 21 20.4802 21 20.908 20.782C21.2843 20.5903 21.5903 20.2843 21.782 19.908C22 19.4802 22 18.9201 22 17.8V10.2C22 9.07989 22 8.51984 21.782 8.09202C21.5903 7.71569 21.2843 7.40973 20.908 7.21799C20.4802 7 19.9201 7 18.8 7H5.2C4.07989 7 3.51984 7 3.09202 7.21799C2.71569 7.40973 2.40973 7.71569 2.21799 8.09202C2 8.51984 2 9.07989 2 10.2V17.8C2 18.9201 2 19.4802 2.21799 19.908C2.40973 20.2843 2.71569 20.5903 3.09202 20.782C3.51984 21 4.0799 21 5.2 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DiamondIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.49954 9H21.4995M9.99954 3L7.99954 9L11.9995 20.5L15.9995 9L13.9995 3M12.6141 20.2625L21.5727 9.51215C21.7246 9.32995 21.8005 9.23885 21.8295 9.13717C21.8551 9.04751 21.8551 8.95249 21.8295 8.86283C21.8005 8.76114 21.7246 8.67005 21.5727 8.48785L17.2394 3.28785C17.1512 3.18204 17.1072 3.12914 17.0531 3.09111C17.0052 3.05741 16.9518 3.03238 16.8953 3.01717C16.8314 3 16.7626 3 16.6248 3H7.37424C7.2365 3 7.16764 3 7.10382 3.01717C7.04728 3.03238 6.99385 3.05741 6.94596 3.09111C6.89192 3.12914 6.84783 3.18204 6.75966 3.28785L2.42633 8.48785C2.2745 8.67004 2.19858 8.76114 2.16957 8.86283C2.144 8.95249 2.144 9.04751 2.16957 9.13716C2.19858 9.23885 2.2745 9.32995 2.42633 9.51215L11.385 20.2625C11.596 20.5158 11.7015 20.6424 11.8279 20.6886C11.9387 20.7291 12.0603 20.7291 12.1712 20.6886C12.2975 20.6424 12.4031 20.5158 12.6141 20.2625Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const PRESET_ICONS: Record<string, React.ReactNode> = {
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

function QualityPill({
  preset,
  selected,
  onSelect,
}: {
  preset: QualityPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      title={preset.tooltip}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-[10px] border text-sm transition-all",
        selected
          ? "border-accent/60 text-[#E8E5DC] bg-accent/10"
          : "border-white/10 text-subtle hover:border-white/20 hover:text-[#E8E5DC] bg-transparent",
      )}
    >
      <span className={cn("flex-shrink-0 transition-colors", selected ? "text-accent" : "text-subtle")}>
        {PRESET_ICONS[preset.id]}
      </span>
      {preset.label}
    </button>
  );
}
