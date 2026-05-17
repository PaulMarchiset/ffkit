import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const DESKTOP = { width: 960, height: 720 };
const NARROW = { width: 800, height: 600 };

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    colorScheme: "dark",
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixelRatio: 0.005,
    },
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], viewport: DESKTOP } },
    { name: "chromium-narrow",  use: { ...devices["Desktop Chrome"], viewport: NARROW  } },
    { name: "firefox-desktop",  use: { ...devices["Desktop Firefox"], viewport: DESKTOP } },
    { name: "firefox-narrow",   use: { ...devices["Desktop Firefox"], viewport: NARROW  } },
    { name: "webkit-desktop",   use: { ...devices["Desktop Safari"], viewport: DESKTOP } },
    { name: "webkit-narrow",    use: { ...devices["Desktop Safari"], viewport: NARROW  } },
  ],
  webServer: {
    command: "npm run test:serve",
    url: BASE_URL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
});
