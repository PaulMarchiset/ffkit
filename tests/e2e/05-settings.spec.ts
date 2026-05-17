import { test, expect } from "@playwright/test";
import { openApp } from "./helpers";

async function openSettings(page: import("@playwright/test").Page) {
  await openApp(page);
  await page.locator('button:has-text("Settings")').first().click();
  await expect(page.locator('button:has-text("Save settings")')).toBeVisible();
}

test.describe("Settings", () => {
  test("default loaded", async ({ page }) => {
    await openSettings(page);
    await expect(page).toHaveScreenshot("settings--default.png");
  });

  test("output folder set", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __tauriMockPreConfig: unknown }).__tauriMockPreConfig = {
        invokeResponses: {
          get_settings: () => ({
            outputFolder: "C:\\Users\\me\\Videos\\converted",
            outputNaming: "{name}_ffkit",
            defaultQuality: "lossless",
            hardwareAccel: "auto",
            updateChannel: "stable",
            concurrentJobs: 2,
            notifyOnDone: true,
            openFolderOnDone: true,
          }),
        },
      };
    });
    await openSettings(page);
    await expect(page.locator("text=C:\\Users\\me\\Videos\\converted")).toBeVisible();
    await expect(page).toHaveScreenshot("settings--folder-set.png");
  });

  test("toggle flipped (notifyOnDone off)", async ({ page }) => {
    await openSettings(page);
    // Click the first toggle (Notify when done).
    await page
      .locator('button[role="switch"]')
      .first()
      .click();
    await expect(page).toHaveScreenshot("settings--toggle-flipped.png");
  });
});
