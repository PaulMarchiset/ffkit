import { useState } from "react";
import { FeatureButtons } from "./FeatureButtons";
import { CommandEditor } from "./CommandEditor";
import { ConfirmOverwritePanel } from "./ConfirmOverwritePanel";
import { PromptTemplatePanel } from "./PromptTemplatePanel";
import { jobsService } from "@/lib/services/jobsService";
import type { FileInfo, JobInputMeta } from "@/lib/types";
import { useCommandState } from "@/lib/useCommandState";
import { usePromptTemplate } from "@/lib/usePromptTemplate";
import {
  applyPromptValues,
  defaultCommandTemplate,
  defaultPromptValues,
  defaultTemplateExt,
  type FeatureTemplate,
} from "@/lib/ffmpeg-args";
import { replaceExtension } from "@/lib/path";
import { Zap } from "lucide-react";

interface Props {
  inputFile: FileInfo | null;
  outputPath: string;
  onJobStart: (jobId: string, outputPath: string, input?: JobInputMeta) => void;
}

export function AdvancedMode({ inputFile, outputPath, onJobStart }: Props) {
  const cmd = useCommandState(defaultCommandTemplate());
  const prompts = usePromptTemplate();
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  // Output container extension for the active template. Seeded from the default
  // template (mp4, matching the default command) and updated on each selection;
  // the run output path's extension is derived from this so the file name
  // matches the format the command actually encodes.
  const [activeExt, setActiveExt] = useState(defaultTemplateExt());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFeatureSelect(template: FeatureTemplate) {
    setActivePresetId(template.id);
    setActiveExt(template.ext);
    if (template.prompts && template.prompts.length > 0) {
      // Seed defaults and reflect the fully substituted command immediately;
      // the parameter controls then drive the command live (no Apply step).
      const values = defaultPromptValues(template);
      prompts.start(template);
      cmd.requestApply(applyPromptValues(template.command, values));
    } else {
      prompts.cancel();
      cmd.requestApply(template.command);
    }
  }

  function handleParamChange(key: string, value: string) {
    prompts.setValue(key, value);
    if (prompts.pending) {
      const next = { ...prompts.values, [key]: value };
      cmd.forceApply(applyPromptValues(prompts.pending.command, next));
    }
  }

  async function handleRun() {
    if (!inputFile || !outputPath) return;
    setError(null);
    setRunning(true);
    try {
      // The incoming outputPath is always the mp4 base from SimpleMode; correct
      // its extension to the active template's format (ffmpeg picks the muxer
      // from the output file name). For mp4 templates this is a no-op.
      const finalOutput = replaceExtension(outputPath, activeExt);

      // The backend substitutes {input}/{output} and tokenizes the template
      // (see ffmpeg::raw_args). The frontend only forwards the template + paths.
      const jobId = await jobsService.start({
        inputPath: inputFile.path,
        outputPath: finalOutput,
        mode: "raw",
        rawTemplate: cmd.command,
        totalDurationMs:
          inputFile.duration != null
            ? Math.round(inputFile.duration * 1000)
            : undefined,
      });
      onJobStart(jobId, finalOutput, {
        size: inputFile.size,
        durationMs:
          inputFile.duration != null ? Math.round(inputFile.duration * 1000) : undefined,
      });
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
        onValueChange={handleParamChange}
        inputFile={inputFile}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleRun}
        disabled={!inputFile || !outputPath || running}
        className="mt-3 w-full flex items-center justify-center py-2 rounded-[10px] text-base font-medium text-white bg-accent hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      ><Zap className="mr-2 mb-1 scale-85" />
        {running ? "Starting…" : "Run"}
      </button>
    </div>
  );
}
