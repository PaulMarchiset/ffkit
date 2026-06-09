import { useRef, useState } from "react";
import { filesService } from "@/lib/services/filesService";
import { pickVideoFile } from "@/lib/dialogs";
import { useFileDrop } from "@/lib/useFileDrop";
import type { FileInfo } from "@/lib/types";
import { FileCard } from "./FileCard";
import { FileDropZone } from "./FileDropZone";

interface Props {
  file: FileInfo | null;
  onFile: (info: FileInfo) => void;
  onConvert?: () => void;
  converting?: boolean;
  outputPath?: string;
  onChangeOutput?: () => void;
}

export function FilePicker({
  file,
  onFile,
  onConvert,
  converting,
  outputPath,
  onChangeOutput,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable callback for useFileDrop: it captures the latest onFile via ref so
  // the drop subscription doesn't need to re-bind on every render.
  const onFileRef = useRef(onFile);
  onFileRef.current = onFile;

  async function loadFile(path: string) {
    setLoading(true);
    setError(null);
    try {
      const info = await filesService.probe(path);
      onFileRef.current(info);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const dragging = useFileDrop({
    onDrop: (paths) => {
      if (paths.length > 0) loadFile(paths[0]);
    },
  });

  async function handlePick() {
    const path = await pickVideoFile();
    if (path) await loadFile(path);
  }

  if (file) {
    return (
      <FileCard
        file={file}
        onClick={handlePick}
        onConvert={onConvert}
        converting={converting}
        outputPath={outputPath}
        onChangeOutput={onChangeOutput}
      />
    );
  }

  return (
    <FileDropZone
      onClick={handlePick}
      dragging={dragging}
      loading={loading}
      error={error}
    />
  );
}
