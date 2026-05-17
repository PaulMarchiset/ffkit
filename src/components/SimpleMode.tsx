import React, { useState, useEffect } from "react";
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

const VERBS = ["compress", "trim", "convert", "resize", "extract", "transcode", "ffmpeg"];

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
  const [verbStyle, setVerbStyle] = useState<React.CSSProperties>({ display: "inline-block" });

  useEffect(() => {
    const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
    let swap: ReturnType<typeof setTimeout>;
    let raf1: number, raf2: number;

    const interval = setInterval(() => {
      // 1. slide current word up and out
      setVerbStyle({
        display: "inline-block",
        opacity: 0,
        transform: "translateY(-20px)",
        transition: "opacity 0.18s ease-in, transform 0.2s ease-in",
      });

      swap = setTimeout(() => {
        // 2. swap text while invisible, snap to bottom entry position
        setVerbIndex((i) => (i + 1) % VERBS.length);
        setVerbStyle({ display: "inline-block", opacity: 0, transform: "translateY(20px)", transition: "none" });

        // 3. after two frames (browser has painted the new position), slide in
        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => {
            setVerbStyle({
              display: "inline-block",
              opacity: 1,
              transform: "translateY(0)",
              transition: `opacity 0.4s ${EASING}, transform 0.4s ${EASING}`,
            });
          });
        });
      }, 220);
    }, 2800);

    return () => {
      clearInterval(interval);
      clearTimeout(swap);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
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
    <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto w-full py-8">
      <h1 className="font-serif text-5xl text-[#E8E5DC] text-center leading-tight tracking-tight">
        Hello, ready to{" "}
        <span className="text-accent" style={verbStyle}>
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
            <AdvancedMode inputFile={file} outputPath={outputPath} onJobStart={onJobStart} />
          </div>
        </div>
      )}
    </div>
  );
}
