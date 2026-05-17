import { useState } from "react";
import { Zap } from "lucide-react";
import { FeatureButtons } from "./FeatureButtons";
import { CommandEditor } from "./CommandEditor";
import { startJob, type FileInfo } from "@/lib/tauri";
import { parseCommandArgs } from "@/lib/utils";
import { useCommandState } from "@/lib/useCommandState";
import { applyPromptValues, type FeatureTemplate } from "@/lib/ffmpeg-args";

const DEFAULT_COMMAND =
  "ffmpeg -i {input} -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k {output}";

interface Props {
  inputFile: FileInfo | null;
  outputPath: string;
  onJobStart: (jobId: string, outputPath: string) => void;
}

export function AdvancedMode({ inputFile, outputPath, onJobStart }: Props) {
  const cmd = useCommandState(DEFAULT_COMMAND);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingTemplate, setPendingTemplate] = useState<FeatureTemplate | null>(null);
  const [promptValues, setPromptValues] = useState<Record<string, string>>({});

  function handleFeatureSelect(template: FeatureTemplate) {
    setActivePresetId(template.id);
    if (template.prompts && template.prompts.length > 0) {
      const defaults: Record<string, string> = {};
      template.prompts.forEach((p) => (defaults[p.key] = ""));
      setPendingTemplate(template);
      setPromptValues(defaults);
    } else {
      setPendingTemplate(null);
      setPromptValues({});
      cmd.requestApply(template.command);
    }
  }

  function handlePromptApply() {
    if (!pendingTemplate) return;
    const filled = applyPromptValues(pendingTemplate.command, promptValues);
    setPendingTemplate(null);
    setPromptValues({});
    cmd.requestApply(filled);
  }

  async function handleRun() {
    if (!inputFile || !outputPath) return;
    setError(null);
    setRunning(true);
    try {
      const filled = cmd.command
        .replace(/\{input\}/g, inputFile.path)
        .replace(/\{output\}/g, outputPath);

      const args = parseCommandArgs(filled);
      const cleaned = args[0]?.toLowerCase() === "ffmpeg" ? args.slice(1) : args;

      const jobId = await startJob({
        inputPath: inputFile.path,
        outputPath,
        mode: "raw",
        rawArgs: cleaned,
      });
      onJobStart(jobId, outputPath);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <FeatureButtons onSelect={handleFeatureSelect} activeId={activePresetId ?? undefined} />

      {cmd.isPendingOverwrite && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-3 text-sm text-amber-300">
          <p className="font-medium mb-2">Replace your edited command?</p>
          <div className="flex gap-2">
            <button
              onClick={cmd.confirmReplace}
              className="px-3 py-1 rounded-[10px] bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors"
            >
              Replace
            </button>
            <button
              onClick={cmd.cancelReplace}
              className="px-3 py-1 rounded-[10px] border border-white/10 text-muted text-xs font-medium hover:text-[#E8E5DC] hover:border-white/20 transition-colors"
            >
              Keep mine
            </button>
          </div>
        </div>
      )}

      <CommandEditor
        command={cmd.command}
        onChange={cmd.onCommandChange}
        onReset={cmd.resetToPreset}
        isDirty={cmd.isDirty}
      />

      {pendingTemplate && pendingTemplate.prompts && (
        <div className="rounded-[10px] border border-accent/20 bg-accent/5 p-3 flex flex-col gap-2">
          <p className="text-xs font-medium text-accent">{pendingTemplate.label} — parameters</p>
          <div className="grid grid-cols-2 gap-2">
            {pendingTemplate.prompts.map((p) => (
              <div key={p.key}>
                <label className="text-xs text-muted mb-1 block">{p.key}</label>
                <input
                  type="text"
                  placeholder={p.placeholder}
                  value={promptValues[p.key] ?? ""}
                  onChange={(e) =>
                    setPromptValues((prev) => ({ ...prev, [p.key]: e.target.value }))
                  }
                  className="w-full px-2 py-1.5 text-sm rounded-[8px] border border-white/10 bg-[#1A1A18] text-[#E8E5DC] outline-none focus:border-accent/50 transition-colors"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePromptApply}
              className="px-3 py-1.5 text-xs font-medium rounded-[8px] bg-accent hover:bg-accent/85 text-white transition-colors"
            >
              Apply
            </button>
            <button
              onClick={() => { setPendingTemplate(null); setPromptValues({}); setActivePresetId(null); }}
              className="px-3 py-1.5 text-xs font-medium rounded-[8px] border border-white/10 text-muted hover:text-[#E8E5DC] hover:border-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        onClick={handleRun}
        disabled={!inputFile || !outputPath || running}
        className="flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-medium text-white bg-accent hover:bg-accent/85 disabled:opacity-30 disabled:cursor-not-allowed transition-all "
      >
        <Zap className="w-4 h-4" />
        {running ? "Starting…" : "Run"}
      </button>
    </div>
  );
}

