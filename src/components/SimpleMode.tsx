import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FileDropZone } from "./FileDropZone";
import { FileCard } from "./FileCard";
import { FileList, type QualityChoice } from "./FileList";
import { QualityButtons } from "./QualityButtons";
import { AdvancedMode } from "./AdvancedMode";
import { HeroGreeting } from "./HeroGreeting";
import { filesService } from "@/lib/services/filesService";
import { jobsService } from "@/lib/services/jobsService";
import { pickVideoFiles, pickOutputFile, pickOutputFolder } from "@/lib/dialogs";
import { useFileDrop } from "@/lib/useFileDrop";
import { defaultOutputPath } from "@/lib/path";
import { useSettings } from "@/lib/settingsContext";
import type {
  BatchItem,
  FileInfo,
  JobInputMeta,
  JobSpec,
  Quality,
} from "@/lib/types";

interface Props {
  /** Called when a preset batch is started — drives the batch progress screen. */
  onBatchStart: (items: BatchItem[]) => void;
  /** Single-job start, used by Advanced (raw) mode. */
  onJobStart: (jobId: string, outputPath: string, input?: JobInputMeta) => void;
  /** Bumped by "Convert another" to clear the selected media (settings kept). */
  resetNonce?: number;
}

export function SimpleMode({ onBatchStart, onJobStart, resetNonce }: Props) {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const [files, setFiles] = useState<FileInfo[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Quality>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [globalQuality, setGlobalQuality] = useState<Quality>(
    settings?.defaultQuality ?? "medium",
  );
  const [outputFolder, setOutputFolder] = useState<string | undefined>(
    settings?.outputFolder,
  );
  // Explicit output path for the single-file (old-look) flow; recomputed from the
  // naming pattern as quality/folder change, overridable via the save dialog.
  const [singleOutput, setSingleOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const namingPattern = settings?.outputNaming ?? "{name}_ffkit";

  // A lone file gets the original single-file card + single-job flow ("old look").
  const singleFile = files.length === 1 ? files[0] : null;
  const singleQuality = singleFile
    ? (overrides[singleFile.path] ?? globalQuality)
    : globalQuality;

  useEffect(() => {
    if (singleFile) {
      setSingleOutput(
        defaultOutputPath(singleFile.path, namingPattern, outputFolder, singleQuality),
      );
    }
  }, [singleFile, namingPattern, outputFolder, singleQuality]);

  // Seed the output folder from settings once it loads (only while untouched).
  const folderTouched = useRef(false);
  useEffect(() => {
    if (!folderTouched.current && settings?.outputFolder !== undefined) {
      setOutputFolder(settings.outputFolder);
    }
  }, [settings?.outputFolder]);

  // "Convert another": clear the media so the drop zone returns. Quality /
  // advanced settings are intentionally kept. Guarded so initial render
  // (nonce 0) doesn't clear anything.
  useEffect(() => {
    if (!resetNonce) return;
    setFiles([]);
    setOverrides({});
    setSelected(new Set());
    setError(null);
  }, [resetNonce]);

  async function addPaths(paths: string[]) {
    const known = new Set(files.map((f) => f.path));
    const fresh = paths.filter((p) => !known.has(p));
    if (fresh.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const probed = await Promise.all(fresh.map((p) => filesService.probe(p)));
      setFiles((prev) => {
        const seen = new Set(prev.map((f) => f.path));
        return [...prev, ...probed.filter((f) => !seen.has(f.path))];
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  // Stable drop handler: capture the latest addPaths via ref so the drop
  // subscription needn't re-bind every render.
  const addPathsRef = useRef(addPaths);
  addPathsRef.current = addPaths;
  const dragging = useFileDrop({
    onDrop: (paths) => addPathsRef.current(paths),
  });

  async function handleAddFiles() {
    const paths = await pickVideoFiles();
    if (paths.length > 0) await addPaths(paths);
  }

  function removeAll() {
    setFiles([]);
    setOverrides({});
    setSelected(new Set());
    setError(null);
  }

  function removeFile(path: string) {
    setFiles((prev) => prev.filter((f) => f.path !== path));
    setOverrides((prev) => {
      if (prev[path] == null) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setSelected((prev) => {
      if (!prev.has(path)) return prev;
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }

  function toggleSelect(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === files.length ? new Set() : new Set(files.map((f) => f.path)),
    );
  }

  function applyQuality(choice: QualityChoice) {
    setOverrides((prev) => {
      const next = { ...prev };
      for (const path of selected) {
        if (choice === "default") delete next[path];
        else next[path] = choice;
      }
      return next;
    });
  }

  async function handleChangeOutputFolder() {
    const folder = await pickOutputFolder();
    if (folder) {
      folderTouched.current = true;
      setOutputFolder(folder);
    }
  }

  async function handleChangeSingleOutput() {
    const path = await pickOutputFile(singleOutput || undefined);
    if (path) setSingleOutput(path);
  }

  // Single-file convert keeps the original single-job experience (JobProgress).
  async function handleConvertSingle() {
    if (!singleFile) return;
    setError(null);
    setConverting(true);
    try {
      const jobId = await jobsService.start({
        inputPath: singleFile.path,
        outputPath: singleOutput,
        mode: "preset",
        quality: singleQuality,
        totalDurationMs:
          singleFile.duration != null ? Math.round(singleFile.duration * 1000) : undefined,
      });
      onJobStart(jobId, singleOutput, {
        size: singleFile.size,
        durationMs:
          singleFile.duration != null ? Math.round(singleFile.duration * 1000) : undefined,
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setConverting(false);
    }
  }

  async function handleConvertAll() {
    if (files.length === 0) return;
    setError(null);
    setConverting(true);
    try {
      const specs: JobSpec[] = files.map((f) => {
        const quality = overrides[f.path] ?? globalQuality;
        return {
          inputPath: f.path,
          outputPath: defaultOutputPath(f.path, namingPattern, outputFolder, quality),
          mode: "preset",
          quality,
          totalDurationMs:
            f.duration != null ? Math.round(f.duration * 1000) : undefined,
        };
      });
      const ids = await jobsService.startBatch(specs);
      const items: BatchItem[] = ids.map((jobId, i) => ({
        jobId,
        file: files[i],
        quality: specs[i].quality as Quality,
        outputPath: specs[i].outputPath,
      }));
      onBatchStart(items);
    } catch (e) {
      setError(String(e));
    } finally {
      setConverting(false);
    }
  }

  const hasFiles = files.length > 0;
  const advancedFile = files[0] ?? null;
  const advancedOutput = advancedFile
    ? defaultOutputPath(advancedFile.path, namingPattern, outputFolder, globalQuality)
    : "";

  return (
    <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto w-full pt-[18vh] pb-8">
      <HeroGreeting />

      <div className="w-full flex flex-col gap-3">
        {files.length === 0 ? (
          <FileDropZone
            onClick={handleAddFiles}
            dragging={dragging}
            loading={loading}
            error={error}
          />
        ) : singleFile ? (
          <>
            <FileCard
              file={singleFile}
              onClick={handleAddFiles}
              onConvert={handleConvertSingle}
              converting={converting}
              outputPath={singleOutput}
              onChangeOutput={handleChangeSingleOutput}
              quality={singleQuality}
            />
            <button
              onClick={handleAddFiles}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted hover:text-fg hover:border-border-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t("batch.addClips")}
            </button>
          </>
        ) : (
          <FileList
            files={files}
            overrides={overrides}
            globalQuality={globalQuality}
            selected={selected}
            outputFolder={outputFolder}
            namingPattern={namingPattern}
            loading={loading}
            converting={converting}
            onAddFiles={handleAddFiles}
            onRemoveFile={removeFile}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onApplyQuality={applyQuality}
            onChangeOutputFolder={handleChangeOutputFolder}
            onConvertAll={handleConvertAll}
            onRemoveAll={removeAll}
          />
        )}

        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div />
          <QualityButtons value={globalQuality} onChange={setGlobalQuality} />
          <div className="flex justify-end">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1 px-4 py-2 text-sm text-muted hover:text-fg transition-colors"
            >
              {t("common.advanced")}
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {hasFiles && error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {showAdvanced && (
        <div className="w-full rounded-2xl bg-surface overflow-hidden">
          <div className="px-5 py-4">
            {/* Advanced (raw) mode is single-file; it operates on the first file
                in the list. Batching the raw path is a separate follow-up. */}
            {files.length > 1 && (
              <p className="mb-3 text-xs text-muted">
                {t("batch.advancedSingleFile", { name: advancedFile?.name })}
              </p>
            )}
            <AdvancedMode
              inputFile={advancedFile}
              outputPath={advancedOutput}
              onJobStart={onJobStart}
            />
          </div>
        </div>
      )}
    </div>
  );
}
