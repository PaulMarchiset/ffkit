import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  command: string;
  onChange: (cmd: string) => void;
  onReset: () => void;
  isDirty: boolean;
}

export function CommandEditor({ command, onChange, onReset, isDirty }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted uppercase tracking-wide">
          {t("command.label")}
        </label>
        {isDirty && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            {t("command.reset")}
          </button>
        )}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-accent font-mono text-sm select-none pointer-events-none">
          $
        </span>
        <textarea
          value={command}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          rows={4}
          className="w-full pl-7 pr-3 py-2.5 rounded-[10px] border border-white/8 bg-term-bg text-term-fg font-mono text-sm resize-none outline-none focus:border-accent/40 transition-colors"
          placeholder="ffmpeg -i {input} ... {output}"
        />
      </div>
      <p className="text-xs text-muted">
        {t("command.helpBefore")}{" "}
        <code className="text-accent">&#123;input&#125;</code> {t("command.helpMid")}{" "}
        <code className="text-accent">&#123;output&#125;</code> {t("command.helpAfter")}
      </p>
    </div>
  );
}
