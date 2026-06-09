import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { FilePicker } from "./FilePicker";
import { QualityButtons } from "./QualityButtons";
import { AdvancedMode } from "./AdvancedMode";
import { HeroGreeting } from "./HeroGreeting";
import { jobsService } from "@/lib/services/jobsService";
import { pickOutputFile } from "@/lib/dialogs";
import type { FileInfo, JobInputMeta, Quality } from "@/lib/types";
import { defaultOutputPath } from "@/lib/path";
import { useSettings } from "@/lib/settingsContext";

interface Props {
  onJobStart: (jobId: string, outputPath: string, input?: JobInputMeta) => void;
  /** Bumped by "Convert another" to clear the selected media (settings kept). */
  resetNonce?: number;
}

export function SimpleMode({ onJobStart, resetNonce }: Props) {
  const { settings } = useSettings();
  const [file, setFile] = useState<FileInfo | null>(null);
  const [quality, setQuality] = useState<Quality>(
    settings?.defaultQuality ?? "medium",
  );
  const [outputPath, setOutputPath] = useState("");
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (file) {
      const pattern = settings?.outputNaming ?? "{name}_ffkit";
      setOutputPath(defaultOutputPath(file.path, pattern, settings?.outputFolder, quality));
    }
  }, [file, settings, quality]);

  // "Convert another": clear the media so the drop zone returns, ready for a new
  // file. Quality / advanced settings are intentionally left untouched. Guarded
  // so the initial render (nonce 0) doesn't clear anything.
  useEffect(() => {
    if (!resetNonce) return;
    setFile(null);
    setOutputPath("");
    setError(null);
  }, [resetNonce]);

  async function handleConvert() {
    if (!file) return;
    setError(null);
    setConverting(true);
    try {
      const jobId = await jobsService.start({
        inputPath: file.path,
        outputPath,
        mode: "preset",
        quality,
        totalDurationMs:
          file.duration != null ? Math.round(file.duration * 1000) : undefined,
      });
      onJobStart(jobId, outputPath, {
        size: file.size,
        durationMs: file.duration != null ? Math.round(file.duration * 1000) : undefined,
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setConverting(false);
    }
  }

  async function handleChangeOutput() {
    const path = await pickOutputFile(outputPath || undefined);
    if (path) setOutputPath(path);
  }

  return (
    <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto w-full pt-[18vh] pb-8">
      <HeroGreeting />

      <div className="w-full flex flex-col gap-3">
        <FilePicker
          file={file}
          onFile={setFile}
          onConvert={file ? handleConvert : undefined}
          converting={converting}
          outputPath={file ? outputPath : undefined}
          onChangeOutput={handleChangeOutput}
        />

        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div />
          <QualityButtons value={quality} onChange={setQuality} />
          <div className="flex justify-end">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1 px-4 py-2 text-sm text-muted hover:text-fg transition-colors"
            >
              Advanced
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {showAdvanced && (
        <div className="w-full rounded-2xl bg-surface overflow-hidden">
          <div className="px-5 py-4">
            <AdvancedMode inputFile={file} outputPath={outputPath} onJobStart={onJobStart} />
          </div>
        </div>
      )}
    </div>
  );
}
