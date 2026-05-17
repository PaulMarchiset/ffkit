import { test, expect } from "@playwright/test";
import { openApp } from "./helpers";

test.describe("App shell", () => {
  test("no encoder badge", async ({ page }) => {
    await openApp(page);
    await expect(page.locator("header svg.animate-spin")).toHaveCount(0);
    await expect(page).toHaveScreenshot("app-shell--no-encoder.png");
  });

  test("encoder badge present (h264_nvenc)", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __tauriMockPreConfig: unknown }).__tauriMockPreConfig = {
        invokeResponses: {
          detect_encoders: () => ({
            available: [{ name: "h264_nvenc", codec: "h264" }],
            bestH264: "h264_nvenc",
            bestH265: null,
          }),
        },
      };
    });
    await openApp(page);
    await expect(page.locator("text=h264_nvenc")).toBeVisible();
    await expect(page).toHaveScreenshot("app-shell--encoder-badge.png");
  });
});
