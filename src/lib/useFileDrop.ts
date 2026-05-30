import { useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useTauriListener } from "@/lib/useTauriListener";

interface DragDropPayload {
  type: string;
  paths?: string[];
}

interface Options {
  onDrop: (paths: string[]) => void;
}

/**
 * Subscribes to the Tauri webview's native drag-drop events and exposes the
 * current "dragging over" state. The subscription lifecycle (including the
 * race defense) is handled by {@link useTauriListener}.
 */
export function useFileDrop({ onDrop }: Options): boolean {
  const [dragging, setDragging] = useState(false);

  useTauriListener(
    (cb: (p: DragDropPayload) => void) =>
      getCurrentWebviewWindow().onDragDropEvent((e) =>
        cb(e.payload as DragDropPayload),
      ),
    (payload) => {
      switch (payload.type) {
        case "over":
        case "enter":
          setDragging(true);
          break;
        case "leave":
        case "cancel":
          setDragging(false);
          break;
        case "drop":
          setDragging(false);
          if (payload.paths && payload.paths.length > 0) {
            onDrop(payload.paths);
          }
          break;
      }
    },
  );

  return dragging;
}
