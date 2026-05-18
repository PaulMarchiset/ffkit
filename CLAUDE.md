# FFKit — agent notes

Tauri 2 desktop ffmpeg GUI. React 19 + Vite 7 + Tailwind v4 frontend in `src/`;
Rust backend in `src-tauri/`.

## Build & test commands

| Command | What it does |
|---|---|
| `npm run build` | `tsc --noEmit` then `vite build`. Authoritative TS check. |
| `npm run test:unit` | Vitest — component lifecycle / hook tests via jsdom + IPC mock. |
| `npm run test:e2e` | Playwright — 114 screenshots across 6 browser×viewport projects. Always serial (see P6.1). |
| `npm run dev` | Vite dev server. |
| `npm run tauri dev` / `npm run tauri build` | Full Tauri (slow; release Rust build). |

Before re-running Playwright, kill any stale preview server on :4173 — `reuseExistingServer: true` will latch onto an outdated `dist/` and produce confusing failures.

## Known false-positive diagnostics

**Stale "declared but never read" / "Cannot find name" during multi-Edit sequences.**
When edits touch imports + usages in separate Edit tool calls, the IDE's TS server may
flash a transient diagnostic between calls (e.g. import removed but usage not yet, or
import added but usage not yet typed in). `tsc --noEmit` via `npm run build` is the
authoritative check and consistently reports zero errors. Do **not** "fix" a diagnostic
mid-sequence — finish the planned edits first, then verify with `npm run build`.

## Heavy directories — do not nuke

- `src-tauri/target/` is 4.4 GB of compiled Rust deps. **Do not `cargo clean`** — a
  full rebuild from cold takes 10+ minutes and incremental builds are fast (~1 min).
- `node_modules/` is normal scale; reinstall is cheap.

## Tokio features (P5.2 audit, 2026-05-18)

`tokio = { features = ["full"] }` in [src-tauri/Cargo.toml](src-tauri/Cargo.toml).
Investigated trimming to `["macros", "rt-multi-thread", "sync"]`. Measured: −37 KB
(−0.31%) on the release binary. tauri-plugin-shell and tauri themselves union back
in `process` / `io-util` / `signal` / `time`, so the only features actually dropped
are `fs`, `net`, `parking_lot`. Not worth the lock-file churn; left at `"full"`.
