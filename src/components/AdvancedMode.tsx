import { useState } from "react";
import { FeatureButtons } from "./FeatureButtons";
import { CommandEditor } from "./CommandEditor";
import { ConfirmOverwritePanel } from "./ConfirmOverwritePanel";
import { PromptTemplatePanel } from "./PromptTemplatePanel";
import { jobsService } from "@/lib/services/jobsService";
import type { FileInfo } from "@/lib/types";
import { buildCommandArgs } from "@/lib/commandBuilder";
import { useCommandState } from "@/lib/useCommandState";
import { usePromptTemplate } from "@/lib/usePromptTemplate";
import { defaultCommandTemplate, type FeatureTemplate } from "@/lib/ffmpeg-args";
import { Zap } from "lucide-react";

interface Props {
  inputFile: FileInfo | null;
  outputPath: string;
  onJobStart: (jobId: string, outputPath: string) => void;
}

export function AdvancedMode({ inputFile, outputPath, onJobStart }: Props) {
  const cmd = useCommandState(defaultCommandTemplate());
  const prompts = usePromptTemplate();
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFeatureSelect(template: FeatureTemplate) {
    setActivePresetId(template.id);
    if (template.prompts && template.prompts.length > 0) {
      prompts.start(template);
    } else {
      prompts.cancel();
      cmd.requestApply(template.command);
    }
  }

  function handlePromptApply() {
    const filled = prompts.apply();
    if (filled) cmd.requestApply(filled);
  }

  function handlePromptCancel() {
    prompts.cancel();
    setActivePresetId(null);
  }

  async function handleRun() {
    if (!inputFile || !outputPath) return;
    setError(null);
    setRunning(true);
    try {
      const args = buildCommandArgs(cmd.command, inputFile.path, outputPath);

      const jobId = await jobsService.start({
        inputPath: inputFile.path,
        outputPath,
        mode: "raw",
        rawArgs: args,
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
        template={prompts.pending}
        values={prompts.values}
        onValueChange={prompts.setValue}
        onApply={handlePromptApply}
        onCancel={handlePromptCancel}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleRun}
        disabled={!inputFile || !outputPath || running}
        className="w-full flex items-center justify-center py-3 rounded-[10px] text-base font-medium text-white bg-accent hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      ><Zap className="mr-2 mb-1 scale-85" />
        {running ? "Starting…" : "Run"}
      </button>
    </div>
  );
}
