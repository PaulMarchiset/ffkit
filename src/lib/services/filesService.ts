import { openPath, openUrl, probeFile } from "@/lib/tauri";
import type { FileInfo } from "@/lib/types";

/**
 * The IPC seam for filesystem / shell interactions: probing an input file for
 * metadata and revealing paths or URLs in the OS. Components go through this
 * service so the actual Tauri calls live in exactly one place (see also
 * {@link jobsService}, {@link settingsService}).
 */
export const filesService = {
  probe: (path: string): Promise<FileInfo> => probeFile(path),
  openPath: (path: string): Promise<void> => openPath(path),
  openUrl: (url: string): Promise<void> => openUrl(url),
};
