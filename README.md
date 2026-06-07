# FFkit

A clean desktop GUI for ffmpeg — because nobody should have to memorize `-c:v libx264 -crf 23 -preset slow` just to make a video smaller.

**Simple mode:** pick a file, choose a quality, hit convert. Done.
**Advanced mode:** raw ffmpeg command access with preset templates, for when you *do* in fact remember the flags and just want a nicer place to type them.

Built with Tauri 2 (Rust backend) + React 19 + TypeScript + Tailwind v4. The ffmpeg binary rides along as a sidecar, so it never argues with whatever ancient ffmpeg you installed in 2019 and forgot about.

---

## Quick start

### Prerequisites

- **Node.js 20+** and **npm** (CI builds on Node 24, so don't be shy)
- **Rust** (stable) — install via [rustup.rs](https://rustup.rs)
- **ffmpeg/ffprobe binaries** in `src-tauri/binaries/` — these are gitignored, so you bring your own (see [Bundled binaries](#bundled-binaries))

On Windows you'll also need the [MSVC build tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (bundled with Visual Studio 2019+). Yes, the multi-gigabyte download. Welcome to native desktop development.

### Install dependencies

```bash
npm install
```

> Use `npm install`, not `npm ci`. The `@tailwindcss/oxide` WASM build drags along some `@emnapi` optional deps that npm cheerfully prunes from the lockfile on Windows, which makes `npm ci`'s strict check throw a tantrum. `npm install` shrugs and moves on.

### Development

```bash
npm run tauri dev
```

### Production build

```bash
npm run tauri build
```

Installers land in `src-tauri/target/release/bundle/`.

---

## Bundled binaries

FFkit ships ffmpeg/ffprobe as sidecars — it never touches the system-installed version, on purpose. Drop the platform-specific binaries into `src-tauri/binaries/`, named with the exact target triple Tauri expects:

| Platform | Files |
|---|---|
| Windows x86-64 | `ffmpeg-x86_64-pc-windows-msvc.exe` `ffprobe-x86_64-pc-windows-msvc.exe` |
| macOS ARM | `ffmpeg-aarch64-apple-darwin` `ffprobe-aarch64-apple-darwin` |
| macOS Intel | `ffmpeg-x86_64-apple-darwin` `ffprobe-x86_64-apple-darwin` |
| Linux x86-64 | `ffmpeg-x86_64-unknown-linux-gnu` `ffprobe-x86_64-unknown-linux-gnu` |

**Where the CI gets them (so you can match it):**

- **Windows** — [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) `ffmpeg-8.1.1-essentials_build` (GPL, pinned). The "essentials" build covers the codecs mortals actually use — x264, x265, VP8/9, AAC, Opus, and friends — without the full build's everything-and-the-kitchen-sink download size. Want the kitchen sink anyway? Swap `essentials` → `full`.
- **Linux** — [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds/releases), `ffmpeg-master-latest-linux64-gpl`
- **macOS** — [evermeet.cx](https://evermeet.cx/ffmpeg/), the static GPL build

The `binaries/` directory is gitignored, so every developer and CI runner provides its own. (We are not committing a 100 MB executable to git. We have standards.)

---

## CI / Release

Two workflows, two jobs in life:

- **[`ci.yml`](.github/workflows/ci.yml)** — cross-platform build verification (Windows, macOS, Linux). Runs on **manual dispatch** so it doesn't fight the release workflow over the same git tag.
- **[`release.yml`](.github/workflows/release.yml)** — fires on a `v*` tag push, builds + signs the **Windows** release, creates a draft GitHub Release, and emits the `latest.json` the in-app updater polls.

**Code signing.** The Tauri updater signature is wired up in `release.yml` via two repo secrets:

| Variable | Purpose |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri updater signing key (base64) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Key passphrase |

OS-level code signing (so Windows SmartScreen / macOS Gatekeeper stop giving users the side-eye) is left as commented-out scaffolding in the workflow. Drop these into your CI secrets and uncomment to enable:

| Variable | Purpose |
|---|---|
| `WINDOWS_CERTIFICATE` | Windows code signing certificate (base64 PFX) |
| `WINDOWS_CERTIFICATE_PASSWORD` | Certificate password |
| `APPLE_CERTIFICATE` | macOS signing certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Certificate password |
| `APPLE_SIGNING_IDENTITY` | e.g. "Developer ID Application: …" |
| `APPLE_ID` | Apple ID for notarisation |
| `APPLE_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Apple team ID |

---

## Auto-updater

The updater points at GitHub Releases, which serves the signed `latest.json` produced by `release.yml`:

```
https://github.com/PaulMarchiset/ffkit/releases/latest/download/latest.json
```

Push a `v*` tag, let `release.yml` do its thing, publish the draft release, and existing installs update themselves. No bespoke update server, no 3 a.m. infrastructure pages — just a tag and some patience. If you fork this, point the endpoint and `pubkey` in [`tauri.conf.json`](src-tauri/tauri.conf.json) at *your* repo and signing key, not ours, or your users will get a delightful surprise.

---

## Project structure

```
ffkit/
├── src/                     React frontend
│   ├── components/          UI components
│   ├── lib/                 Tauri wrappers, presets, utilities
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/
│   ├── binaries/            Bundled ffmpeg/ffprobe (gitignored — BYO)
│   ├── src/
│   │   ├── commands/        Tauri IPC commands
│   │   ├── ffmpeg/          Process management, progress parsing, presets
│   │   ├── state.rs         Shared app state
│   │   └── lib.rs
│   └── tauri.conf.json
└── .github/workflows/       ci.yml + release.yml
```

## License

GPL-3.0 — not a lifestyle choice, just math: the bundled ffmpeg builds are GPL, so we are too. Them's the rules.
