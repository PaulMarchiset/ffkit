/**
 * Single-file mock for every Tauri-API surface FFKit imports.
 * Vite aliases all four real modules to this file when MODE === "test".
 *
 *  - @tauri-apps/api/core           -> invoke
 *  - @tauri-apps/api/event          -> listen
 *  - @tauri-apps/api/webviewWindow  -> getCurrentWebviewWindow
 *  - @tauri-apps/plugin-dialog      -> open, save
 *
 * The mock exposes `window.__tauriMock` so Playwright tests can:
 *   - override invoke() responses per-command
 *   - dispatch app events (job-progress, job-done, job-log)
 *   - trigger drag/drop on the current window
 */

type InvokeResponder = unknown | ((args: unknown) => unknown);
type EventCallback = (event: { payload: unknown }) => void;
type DragDropCallback = (event: { payload: unknown }) => void;

const DEFAULT_INVOKE_RESPONSES: Record<string, InvokeResponder> = {
  get_settings: () => ({
    outputFolder: null,
    outputNaming: "{name}_ffkit",
    defaultQuality: "medium",
    hardwareAccel: "auto",
    updateChannel: "stable",
    concurrentJobs: 1,
    notifyOnDone: true,
    openFolderOnDone: false,
  }),
  detect_encoders: () => ({
    available: [],
    bestH264: null,
    bestH265: null,
    gpus: { nvidia: false, intel: false, amd: false, names: [] },
    warnings: [],
  }),
  probe_file: () => ({
    path: "C:\\videos\\sample.mp4",
    name: "sample.mp4",
    size: 12_345_678,
    duration: 125.4,
    width: 1920,
    height: 1080,
    videoCodec: "h264",
    audioCodec: "aac",
    bitrate: 1_500_000,
    container: "mp4",
  }),
  start_job: () => "mock-job-id",
  cancel_job: () => undefined,
  list_jobs: () => [],
  set_settings: () => undefined,
  open_path: () => undefined,
  open_url: () => undefined,
};

const invokeResponses: Record<string, InvokeResponder> = { ...DEFAULT_INVOKE_RESPONSES };
const listeners = new Map<string, Set<EventCallback>>();
let dragDropCb: DragDropCallback | undefined;

let dialogOpenResult: string | null = null;
let dialogSaveResult: string | null = null;

// Allow Playwright to pre-configure the mock before the bundle loads by
// setting window.__tauriMockPreConfig in addInitScript.
interface PreConfig {
  invokeResponses?: Record<string, InvokeResponder>;
  dialogOpenResult?: string | null;
  dialogSaveResult?: string | null;
}

if (typeof window !== "undefined") {
  const pre = (window as unknown as { __tauriMockPreConfig?: PreConfig })
    .__tauriMockPreConfig;
  if (pre?.invokeResponses) Object.assign(invokeResponses, pre.invokeResponses);
  if (pre?.dialogOpenResult !== undefined) dialogOpenResult = pre.dialogOpenResult;
  if (pre?.dialogSaveResult !== undefined) dialogSaveResult = pre.dialogSaveResult;
}

// ── @tauri-apps/api/core ─────────────────────────────────────────────────

export async function invoke<T>(cmd: string, args?: unknown): Promise<T> {
  const responder = invokeResponses[cmd];
  if (responder === undefined) {
    throw new Error(`[tauri-mock] No mock for invoke("${cmd}")`);
  }
  if (typeof responder === "function") {
    return (responder as (args: unknown) => T)(args);
  }
  return responder as T;
}

// ── @tauri-apps/api/event ────────────────────────────────────────────────

export async function listen<T>(
  event: string,
  cb: (e: { payload: T }) => void,
): Promise<() => void> {
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  set.add(cb as EventCallback);
  return () => {
    set!.delete(cb as EventCallback);
  };
}

// ── @tauri-apps/api/webviewWindow ────────────────────────────────────────

export function getCurrentWebviewWindow() {
  return {
    onDragDropEvent: async (cb: DragDropCallback): Promise<() => void> => {
      dragDropCb = cb;
      return () => {
        if (dragDropCb === cb) dragDropCb = undefined;
      };
    },
  };
}

// ── @tauri-apps/plugin-dialog ────────────────────────────────────────────

interface DialogOptions {
  directory?: boolean;
}

export async function open(options?: DialogOptions): Promise<string | null> {
  void options;
  return dialogOpenResult;
}

export async function save(): Promise<string | null> {
  return dialogSaveResult;
}

// ── Test control surface (exposed on window) ─────────────────────────────

interface TauriMockApi {
  setInvokeResponse(cmd: string, value: InvokeResponder): void;
  resetInvokeResponses(): void;
  emit(event: string, payload: unknown): void;
  triggerDragDrop(payload: unknown): void;
  setDialogOpenResult(path: string | null): void;
  setDialogSaveResult(path: string | null): void;
  listenerCount(event: string): number;
}

const api: TauriMockApi = {
  setInvokeResponse(cmd, value) {
    invokeResponses[cmd] = value;
  },
  resetInvokeResponses() {
    for (const key of Object.keys(invokeResponses)) {
      delete invokeResponses[key];
    }
    Object.assign(invokeResponses, DEFAULT_INVOKE_RESPONSES);
  },
  emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    for (const cb of set) cb({ payload });
  },
  triggerDragDrop(payload) {
    dragDropCb?.({ payload });
  },
  setDialogOpenResult(path) {
    dialogOpenResult = path;
  },
  setDialogSaveResult(path) {
    dialogSaveResult = path;
  },
  listenerCount(event) {
    return listeners.get(event)?.size ?? 0;
  },
};

declare global {
  interface Window {
    __tauriMock?: TauriMockApi;
  }
}

if (typeof window !== "undefined") {
  window.__tauriMock = api;
}

export const __tauriMock = api;
