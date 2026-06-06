import { useState } from "react";
import { cn } from "@/lib/cn";
import { FEATURE_TEMPLATES, CATEGORIES, type Category, type FeatureTemplate } from "@/lib/ffmpeg-args";

interface Props {
  onSelect: (template: FeatureTemplate) => void;
  activeId?: string;
}

export function FeatureButtons({ onSelect, activeId }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>(CATEGORIES[0]);
  const filtered = FEATURE_TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "inline-flex items-center justify-center h-8 px-3.5 rounded-[9px] text-sm font-medium transition-colors",
              activeCategory === cat
                ? "bg-surface-2 text-fg"
                : "text-muted ring-1 ring-inset ring-border-soft hover:text-fg hover:ring-border-hover",
            )}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="inline-flex self-start gap-1 p-1 rounded-[10px] bg-surface-2 border border-border-soft">
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className={cn(
              "inline-flex items-center justify-center h-7 px-3 rounded-[7px] text-sm transition-colors",
              activeId === t.id
                ? "bg-white/10 text-fg"
                : "text-muted hover:text-fg",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
