import { useState } from "react";
import { Play, FolderOpen } from "lucide-react";
import { FeatureButtons } from "./FeatureButtons";
import { CommandEditor } from "./CommandEditor";
import {
  startJob,
  pickVideoFile,
  pickOutputFile,
  probeFile,
  type FileInfo,
} from "@/lib/tauri";
import { parseCommandArgs } from "@/lib/utils";
import type { FeatureTemplate } from "@/lib/ffmpeg-args";

const DEFAULT_COMMAND =
  "ffmpeg -i {input} -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k {output}";

interface Props {
  onJobStart: (jobId: string, outputPath: string) => void;
}

export function AdvancedMode({ onJobStart }: Props) {
  const [command, setCommand] = useState(DEFAULT_COMMAND);
  const [lastPresetCommand, setLastPresetCommand] = useState(DEFAULT_COMMAND);
  const [isDirty, setIsDirty] = useState(false);
  const [inputFile, setInputFile] = useState<FileInfo | null>(null);
  const [outputPath, setOutputPath] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);

  function handleCommandChange(cmd: string) {
    setCommand(cmd);
    setIsDirty(cmd !== lastPresetCommand);
  }

  function handleFeatureSelect(cmd: string, _template: FeatureTemplate) {
    if (isDirty) {
      setConfirmOverwrite(true);
      setPendingCommand(cmd);
    } else {
      applyCommand(cmd);
    }
  }

  function applyCommand(cmd: string) {
    setCommand(cmd);
    setLastPresetCommand(cmd);
    setIsDirty(false);
    setConfirmOverwrite(false);
    setPendingCommand(null);
  }

  async function pickInput() {
    const path = await pickVideoFile();
    if (!path) return;
    try {
      const info = await probeFile(path);
      setInputFile(info);
    } catch {
      setInputFile({ path, name: path.split(/[/\\]/).pop() ?? path, size: 0 });
    }
  }

  async function pickOutput() {
    const path = await pickOutputFile(outputPath || undefined);
    if (path) setOutputPath(path);
  }

  async function handleRun() {
    if (!inputFile || !outputPath) return;
    setError(null);
    setRunning(true);
    try {
      const filled = command
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
    <div className="flex gap-5">
      {/* Left pane: presets */}
      <div className="w-44 flex-shrink-0 border-r border-white/8 pr-5">
        <p className="text-xs text-muted uppercase tracking-wide mb-2">
          Presets
        </p>
        <FeatureButtons onSelect={handleFeatureSelect} />
      </div>

      {/* Right pane */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {confirmOverwrite && (
          <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-3 text-sm text-amber-300">
            <p className="font-medium mb-2">Replace your edited command?</p>
            <div className="flex gap-2">
              <button
                onClick={() => pendingCommand && applyCommand(pendingCommand)}
                className="px-3 py-1 rounded-[10px] bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors"
              >
                Replace
              </button>
              <button
                onClick={() => { setConfirmOverwrite(false); setPendingCommand(null); }}
                className="px-3 py-1 rounded-[10px] border border-white/10 text-muted text-xs font-medium hover:text-[#E8E5DC] hover:border-white/20 transition-colors"
              >
                Keep mine
              </button>
            </div>
          </div>
        )}

        <CommandEditor
          command={command}
          onChange={handleCommandChange}
          onReset={() => { setCommand(lastPresetCommand); setIsDirty(false); }}
          isDirty={isDirty}
        />

        <div className="grid grid-cols-2 gap-3">
          <FilePicker_Mini
            label="Input"
            path={inputFile?.name ?? null}
            onClick={pickInput}
          />
          <FilePicker_Mini
            label="Output"
            path={outputPath ? outputPath.split(/[/\\]/).pop() ?? outputPath : null}
            onClick={pickOutput}
          />
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <button
          onClick={handleRun}
          disabled={!inputFile || !outputPath || running}
          className="flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-medium text-white bg-accent hover:bg-accent/85 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent/20"
        >
          <Play className="w-4 h-4" />
          {running ? "Starting…" : "Run"}
        </button>
      </div>
    </div>
  );
}

function FilePicker_Mini({
  label,
  path,
  onClick,
}: {
  label: string;
  path: string | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] border border-white/8 bg-[#1A1A18] hover:border-white/15 transition-colors text-left"
    >
      <FolderOpen className="w-4 h-4 text-muted flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm text-[#E8E5DC] truncate">
          {path ?? "Choose file…"}
        </p>
      </div>
    </button>
  );
}
