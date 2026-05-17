import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import * as ScrollArea from "@radix-ui/react-scroll-area";

interface Props {
  lines: string[];
}

export function JobLog({ lines }: Props) {
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [lines, open]);

  return (
    <div className="w-full rounded-2xl border border-white/8 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-muted hover:text-[#E8E5DC] transition-colors"
      >
        <span>ffmpeg log</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <ScrollArea.Root className="h-48 border-t border-white/8">
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
            <ScrollArea.Thumb className="bg-white/20 rounded-full" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      )}
    </div>
  );
}
