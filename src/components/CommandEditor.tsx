import { useRef } from "react";
import { RotateCcw } from "lucide-react";

interface Props {
  command: string;
  onChange: (cmd: string) => void;
  onReset: () => void;
  isDirty: boolean;
}

export function CommandEditor({ command, onChange, onReset, isDirty }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted uppercase tracking-wide">
          ffmpeg command
        </label>
        {isDirty && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-muted hover:text-[#E8E5DC] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>
      <textarea
        ref={ref}
        value={command}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        rows={4}
        className="w-full px-3 py-2.5 rounded-[10px] border border-white/8 bg-[#141412] text-accent font-mono text-sm resize-none outline-none focus:border-accent/40 transition-colors"
        placeholder="ffmpeg -i {input} ... {output}"
      />
      <p className="text-xs text-muted">
        Use <code className="text-accent">&#123;input&#125;</code> and{" "}
        <code className="text-accent">&#123;output&#125;</code> as path placeholders.
      </p>
    </div>
  );
}
