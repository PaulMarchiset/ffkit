import { useState, useEffect, useRef } from "react";
import { FolderOpen, ChevronDown, ChevronUp } from "lucide-react";
import { FilePicker } from "./FilePicker";
import { QualityButtons } from "./QualityButtons";
import { AdvancedMode } from "./AdvancedMode";
import {
  startJob,
  pickOutputFile,
  type FileInfo,
  type Quality,
  type Settings,
} from "@/lib/tauri";
import { defaultOutputPath } from "@/lib/presets";
import { useTypewriter } from "@/lib/useTypewriter";

const VERBS = ["compress", "trim", "convert", "resize", "extract", "transcode", "ffmpeg"];

interface Props {
  settings: Settings | null;
  onJobStart: (jobId: string, outputPath: string) => void;
}

export function SimpleMode({ settings, onJobStart }: Props) {
  const [file, setFile] = useState<FileInfo | null>(null);
  const [quality, setQuality] = useState<Quality>(
    settings?.defaultQuality ?? "medium",
  );
  const [outputPath, setOutputPath] = useState("");
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const verbIdxRef = useRef(1);
  const displayedVerb = useTypewriter(VERBS[0], () => {
    const next = VERBS[verbIdxRef.current % VERBS.length];
    verbIdxRef.current++;
    return next;
  });

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
      const jobId = await startJob({
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
      <h1 className="font-serif text-5xl text-fg text-center leading-tight tracking-tight">
        Hello, ready to{" "}
        <span className="text-accent">
          {displayedVerb}
        </span>
        ?
      </h1>

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

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
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
