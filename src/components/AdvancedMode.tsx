import { useState } from "react";
import { Zap } from "lucide-react";
import { FeatureButtons } from "./FeatureButtons";
import { CommandEditor } from "./CommandEditor";
import { ConfirmOverwritePanel } from "./ConfirmOverwritePanel";
import { PromptTemplatePanel } from "./PromptTemplatePanel";
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

      <ConfirmOverwritePanel
        visible={cmd.isPendingOverwrite}
        onReplace={cmd.confirmReplace}
        onCancel={cmd.cancelReplace}
      />

      <CommandEditor
        command={cmd.command}
        onChange={cmd.onCommandChange}
        onReset={cmd.resetToPreset}
        isDirty={cmd.isDirty}
      />

      <PromptTemplatePanel
        template={pendingTemplate}
        values={promptValues}
        onValueChange={(key, value) =>
          setPromptValues((prev) => ({ ...prev, [key]: value }))
        }
        onApply={handlePromptApply}
        onCancel={() => {
          setPendingTemplate(null);
          setPromptValues({});
          setActivePresetId(null);
        }}
      />

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

