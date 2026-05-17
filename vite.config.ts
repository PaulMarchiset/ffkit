import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

const TAURI_MOCK_ALIASES = {
  "@tauri-apps/api/core": path.resolve(__dirname, "./src/test/mocks/tauri.ts"),
  "@tauri-apps/api/event": path.resolve(__dirname, "./src/test/mocks/tauri.ts"),
  "@tauri-apps/api/webviewWindow": path.resolve(__dirname, "./src/test/mocks/tauri.ts"),
  "@tauri-apps/plugin-dialog": path.resolve(__dirname, "./src/test/mocks/tauri.ts"),
};

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      ...(mode === "test" ? TAURI_MOCK_ALIASES : {}),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));
