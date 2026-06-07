/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const TAURI_MOCK = path.resolve(__dirname, "./src/test/mocks/tauri.ts");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tauri-apps/api/core": TAURI_MOCK,
      "@tauri-apps/api/event": TAURI_MOCK,
      "@tauri-apps/api/webviewWindow": TAURI_MOCK,
      "@tauri-apps/api/window": TAURI_MOCK,
      "@tauri-apps/api/app": TAURI_MOCK,
      "@tauri-apps/plugin-dialog": TAURI_MOCK,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    globals: true,
    css: false,
  },
});
