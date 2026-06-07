import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * The IPC seam for the native title-bar caption controls. The custom window
 * chrome (see WindowControls) drives min/max/close through this service so the
 * Tauri window API is called in exactly one place and stays mockable like the
 * rest of the seam (see also {@link filesService}, {@link systemService}).
 *
 * The current window is resolved lazily per call rather than at module load, so
 * importing this file never touches Tauri internals.
 */
export const windowService = {
  minimize: (): Promise<void> => getCurrentWindow().minimize(),
  toggleMaximize: (): Promise<void> => getCurrentWindow().toggleMaximize(),
  close: (): Promise<void> => getCurrentWindow().close(),
};
