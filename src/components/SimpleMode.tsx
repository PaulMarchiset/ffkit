import { useEffect, useState } from "react";
import { FolderOpen, ChevronDown, ChevronUp } from "lucide-react";
import { FilePicker } from "./FilePicker";
import { QualityButtons } from "./QualityButtons";
import { AdvancedMode } from "./AdvancedMode";
import { HeroGreeting } from "./HeroGreeting";
import { jobsService } from "@/lib/services/jobsService";
import { pickOutputFile } from "@/lib/dialogs";
import type { FileInfo, Quality } from "@/lib/types";
import { defaultOutputPath } from "@/lib/path";
import { useSettings } from "@/lib/settingsContext";

interface Props {
  onJobStart: (jobId: string, outputPath: string) => void;
}

export function SimpleMode({ onJobStart }: Props) {
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
      setOutputPath(defaultOutputPath(file.path, pattern, settings?.outputFolder));
    }
  }, [file, settings]);

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
      });
      onJobStart(jobId, outputPath);
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
    <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto w-full py-8">
      <HeroGreeting />

      <div className="w-full flex flex-col gap-3">
        <FilePicker
          file={file}
          onFile={setFile}
          onConvert={file ? handleConvert : undefined}
          converting={converting}
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

        {file && (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 px-3 py-2 rounded-xl border border-border-soft bg-surface text-sm text-muted truncate">
              {outputPath || "—"}
            </div>
            <button
              onClick={handleChangeOutput}
              className="flex-shrink-0 p-2 rounded-xl border border-border-soft text-muted hover:text-fg hover:border-border-strong transition-colors"
              title="Change output path"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {showAdvanced && (
        <div className="w-full rounded-2xl border border-border-soft bg-surface overflow-hidden">
          <div className="px-5 py-4">
            <AdvancedMode inputFile={file} outputPath={outputPath} onJobStart={onJobStart} />
          </div>
        </div>
      )}
    </div>
  );
}
