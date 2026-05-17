import { useState, useEffect } from "react";
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

const VERBS = ["compress", "trim", "convert", "resize", "extract", "transcode"];

interface Props {
  settings: Settings | null;
  onJobStart: (jobId: string, outputPath: string) => void;
}

export function SimpleMode({ settings, onJobStart }: Props) {
  const [file, setFile] = useState<FileInfo | null>(null);
  const [quality, setQuality] = useState<Quality>(
    (settings?.defaultQuality as Quality) ?? "medium",
  );
  const [outputPath, setOutputPath] = useState("");
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Animated verb cycling
  const [verbIndex, setVerbIndex] = useState(0);
  const [verbExiting, setVerbExiting] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setVerbExiting(true);
      setTimeout(() => {
        setVerbIndex((i) => (i + 1) % VERBS.length);
        setVerbExiting(false);
      }, 280);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (file) {
      const pattern = settings?.outputNaming ?? "{name}_ffkit";
      const folder = settings?.outputFolder;
      if (folder) {
        const sep = file.path.includes("\\") ? "\\" : "/";
        const filename = file.name;
        const dotIdx = filename.lastIndexOf(".");
        const name = dotIdx >= 0 ? filename.slice(0, dotIdx) : filename;
        setOutputPath(`${folder}${sep}${pattern.replace("{name}", name)}.mp4`);
      } else {
        setOutputPath(defaultOutputPath(file.path, pattern));
      }
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
    <div className="flex flex-col items-center min-h-[calc(100vh-100px)] gap-6 max-w-2xl mx-auto w-full pt-16">
      <h1 className="font-serif text-5xl text-[#E8E5DC] text-center leading-tight tracking-tight">
        Hello, ready to{" "}
        <span
          key={verbIndex}
          className="text-accent"
          style={{
            display: "inline-block",
            opacity: verbExiting ? 0 : 1,
            transform: verbExiting ? "translateY(-5px)" : "translateY(0)",
            transition: "opacity 0.28s ease, transform 0.28s ease",
            animation: !verbExiting ? "word-enter 0.32s ease-out" : "none",
          }}
        >
          {VERBS[verbIndex]}
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

        <div className="flex items-center gap-2">
          <QualityButtons value={quality} onChange={setQuality} />

          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 px-4 py-2 text-sm text-muted hover:text-[#E8E5DC] transition-colors ml-auto"
          >
            Advanced
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {file && (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 px-3 py-2 rounded-xl border border-white/8 bg-surface text-sm text-muted truncate">
              {outputPath || "—"}
            </div>
            <button
              onClick={handleChangeOutput}
              className="flex-shrink-0 p-2 rounded-xl border border-white/8 text-muted hover:text-[#E8E5DC] hover:border-white/15 transition-colors"
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
        <div className="w-full rounded-2xl border border-white/8 bg-surface overflow-hidden">
          <div className="px-5 py-4">
            <AdvancedMode onJobStart={onJobStart} />
          </div>
        </div>
      )}
    </div>
  );
}
