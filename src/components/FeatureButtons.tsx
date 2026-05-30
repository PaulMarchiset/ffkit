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
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors border leading-full",
              activeCategory === cat
                ? "bg-accent/15 text-accent border-accent/30"
                : "text-muted border-transparent hover:text-fg hover:border-border",
            )}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className={cn(
              "px-3 py-1.5 rounded-[8px] text-sm border transition-colors",
              activeId === t.id
                ? "bg-accent/10 text-accent border-accent/30"
                : "text-subtle border-border-soft hover:text-fg hover:border-border-strong hover:bg-white/5",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
