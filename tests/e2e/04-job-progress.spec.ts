import { test, expect } from "@playwright/test";
import {
  openApp,
  startMockJob,
  emitJobProgress,
  emitJobDone,
  emitJobLog,
} from "./helpers";

test.describe("JobProgress", () => {
  test("running mid-job", async ({ page }) => {
    await openApp(page);
    await startMockJob(page);
    await emitJobProgress(page, {
      percentage: 47.3,
      speed: 2.5,
      etaSecs: 32,
      totalSize: 18_500_000,
      fps: 60,
    });
    await expect(page.locator("text=47.3%")).toBeVisible();
    await expect(page).toHaveScreenshot("job--running.png");
  });

  test("running with log open", async ({ page }) => {
    await openApp(page);
    await startMockJob(page);
    await emitJobProgress(page, { percentage: 12.0, fps: 30, etaSecs: 90 });
    await emitJobLog(page, "[libx264 @ 0x55] using cpu capabilities: MMX2 SSE2Fast");
    await emitJobLog(page, "[libx264 @ 0x55] profile High, level 4.0");
    await emitJobLog(page, "frame=  120 fps= 30 q=23.0 size=    1024kB");
    await page.locator('button:has-text("ffmpeg log")').click();
    await expect(page.locator("text=profile High")).toBeVisible();
    await expect(page).toHaveScreenshot("job--running-log-open.png");
  });

  test("success", async ({ page }) => {
    await openApp(page);
    await startMockJob(page);
    await emitJobProgress(page, { percentage: 99.0, fps: 50 });
    await emitJobDone(page, { success: true });
    await expect(page.locator("text=Done.")).toBeVisible();
    await expect(page).toHaveScreenshot("job--success.png");
  });

  test("cancelled", async ({ page }) => {
    await openApp(page);
    await startMockJob(page);
    await emitJobProgress(page, { percentage: 30.0 });
    await emitJobDone(page, { success: false, cancelled: true });
    await expect(page.locator("text=Cancelled.")).toBeVisible();
    await expect(page).toHaveScreenshot("job--cancelled.png");
  });

  test("failed", async ({ page }) => {
    await openApp(page);
    await startMockJob(page);
    await emitJobProgress(page, { percentage: 15.0 });
    await emitJobDone(page, {
      success: false,
      cancelled: false,
      error: "Error: codec libxyz not found",
    });
    await expect(page.locator("text=Failed.")).toBeVisible();
    await expect(page).toHaveScreenshot("job--failed.png");
  });
});
