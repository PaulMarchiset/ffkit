import { Page, expect } from "@playwright/test";

declare global {
  interface Window {
    __tauriMock?: {
      setInvokeResponse(cmd: string, value: unknown): void;
      resetInvokeResponses(): void;
      emit(event: string, payload: unknown): void;
      triggerDragDrop(payload: unknown): void;
      setDialogOpenResult(path: string | null): void;
      setDialogSaveResult(path: string | null): void;
      listenerCount(event: string): number;
    };
  }
}

export async function openApp(page: Page) {
  await page.goto("/");
  // Wait for App's initial effect chain (getSettings + detectEncoders) to settle.
  await expect(page.locator("text=Hello, ready to")).toBeVisible();
}

export async function dropFile(page: Page, filePath = "C:\\videos\\sample.mp4") {
  await page.evaluate((p) => {
    window.__tauriMock!.triggerDragDrop({ type: "drop", paths: [p] });
  }, filePath);
  await expect(page.locator("text=sample.mp4")).toBeVisible();
}

export async function emitJobProgress(page: Page, fields: Partial<Record<string, unknown>>) {
  await page.evaluate((payload) => {
    window.__tauriMock!.emit("job-progress", {
      jobId: "mock-job-id",
      frame: 0,
      fps: 0,
      speed: 0,
      outTimeMs: 0,
      totalSize: 0,
      percentage: 0,
      etaSecs: 0,
      done: false,
      ...payload,
    });
  }, fields);
}

export async function emitJobDone(
  page: Page,
  payload: { success?: boolean; cancelled?: boolean; error?: string | null } = {},
) {
  await page.evaluate((p) => {
    window.__tauriMock!.emit("job-done", {
      jobId: "mock-job-id",
      success: p.success ?? true,
      cancelled: p.cancelled ?? false,
      outputPath: "C:\\videos\\sample_ffkit.mp4",
      error: p.error ?? null,
    });
  }, payload);
}

export async function emitJobLog(page: Page, line: string) {
  await page.evaluate(
    (l) => window.__tauriMock!.emit("job-log", { jobId: "mock-job-id", line: l }),
    line,
  );
}

export async function startMockJob(page: Page) {
  await dropFile(page);
  // Convert button is the small green button on the file card (title="Convert").
  await page.locator('button[title="Convert"]').click();
  // The JobProgress screen renders "..." after the typewriter word.
  await expect(page.locator('text=Probing...')).toBeVisible();
}
