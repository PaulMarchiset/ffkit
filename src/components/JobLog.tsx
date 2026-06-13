import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import * as ScrollArea from "@radix-ui/react-scroll-area";

interface Props {
  lines: string[];
}

export function JobLog({ lines }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [lines, open]);

  return (
    <div className="w-full rounded-2xl border border-border-soft overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-muted hover:text-fg transition-colors"
      >
        <span>{t("job.log")}</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <ScrollArea.Root className="h-48 border-t border-border-soft">
          <ScrollArea.Viewport className="w-full h-full">
            <div className="p-3 font-mono text-xs text-muted space-y-0.5">
              {lines.map((line, i) => (
                <div key={i} className="break-all leading-relaxed">
                  {line}
                </div>
              ))}
              <div ref={endRef} />
            </div>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" className="w-1.5 p-0.5">
            <ScrollArea.Thumb className="bg-elevate-6 rounded-full" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      )}
    </div>
  );
}
