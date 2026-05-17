import { test, expect } from "@playwright/test";
import { openApp, dropFile } from "./helpers";

async function openAdvanced(page: import("@playwright/test").Page) {
  await openApp(page);
  await dropFile(page);
  await page.locator('button:has-text("Advanced")').click();
  await expect(page.locator("text=ffmpeg command")).toBeVisible();
}

test.describe("AdvancedMode", () => {
  test("default state (no preset, not dirty)", async ({ page }) => {
    await openAdvanced(page);
    await expect(page).toHaveScreenshot("advanced--default.png");
  });

  test("preset applied (H.265 under Compress)", async ({ page }) => {
    await openAdvanced(page);
    await page.locator('button:has-text("H.265")').click();
    await expect(page.locator("textarea")).toContainText("libx265");
    await expect(page).toHaveScreenshot("advanced--preset-applied.png");
  });

  test("edited / dirty (Reset visible)", async ({ page }) => {
    await openAdvanced(page);
    const textarea = page.locator("textarea");
    await textarea.fill(
      "ffmpeg -i {input} -c:v libx264 -crf 18 -preset slow {output}",
    );
    await expect(page.locator('button:has-text("Reset")')).toBeVisible();
    await expect(page).toHaveScreenshot("advanced--dirty.png");
  });

  test("confirm overwrite dialog", async ({ page }) => {
    await openAdvanced(page);
    await page.locator("textarea").fill("ffmpeg -i {input} my custom command {output}");
    await page.locator('button:has-text("Convert")').first(); // ensure layout stable
    // Selecting a preset while dirty triggers the confirm-overwrite panel.
    await page.locator('button:has-text("Resize")').click();
    await page.locator('button:has-text("720p")').click();
    await expect(page.locator("text=Replace your edited command?")).toBeVisible();
    await expect(page).toHaveScreenshot("advanced--confirm-overwrite.png");
  });

  test("prompt template (Trim with start/end)", async ({ page }) => {
    await openAdvanced(page);
    await page.locator('button:has-text("Edit")').click();
    await page.locator('button:has-text("Trim")').click();
    await expect(page.locator("text=Trim — parameters")).toBeVisible();
    await expect(page).toHaveScreenshot("advanced--prompt-template.png");
  });
});
