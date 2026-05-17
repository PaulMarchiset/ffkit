import { test, expect } from "@playwright/test";
import { openApp, dropFile } from "./helpers";

test.describe("SimpleMode", () => {
  test("empty / idle", async ({ page }) => {
    await openApp(page);
    await expect(page.locator("text=Drop your video here")).toBeVisible();
    await expect(page).toHaveScreenshot("simple--empty.png");
  });

  test("file loaded (collapsed advanced)", async ({ page }) => {
    await openApp(page);
    await dropFile(page);
    await expect(page.locator("text=sample.mp4")).toBeVisible();
    await expect(page).toHaveScreenshot("simple--file-loaded.png");
  });

  test("file loaded with advanced open", async ({ page }) => {
    await openApp(page);
    await dropFile(page);
    await page.locator('button:has-text("Advanced")').click();
    await expect(page.locator("text=ffmpeg command")).toBeVisible();
    await expect(page).toHaveScreenshot("simple--advanced-open.png");
  });

  test("probe error", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __tauriMockPreConfig: unknown }).__tauriMockPreConfig = {
        invokeResponses: {
          probe_file: () => {
            throw new Error("Invalid file: not a recognized media format");
          },
        },
      };
    });
    await openApp(page);
    await page.evaluate(() => {
      window.__tauriMock!.triggerDragDrop({
        type: "drop",
        paths: ["C:\\videos\\broken.mp4"],
      });
    });
    await expect(page.locator("text=Invalid file")).toBeVisible();
    await expect(page).toHaveScreenshot("simple--probe-error.png");
  });
});
