# FFkit

A clean desktop GUI for ffmpeg. Simple mode lets you pick a file, choose quality, and convert. Advanced mode gives you raw ffmpeg command access with preset templates.

Built with Tauri 2 (Rust backend) + React + TypeScript + Tailwind CSS.

---

## Quick start

### Prerequisites

- **Node.js 18+** and **npm**
- **Rust** (stable) — install via [rustup.rs](https://rustup.rs)
- **ffmpeg/ffprobe binaries** in `src-tauri/binaries/` (see [Bundled binaries](#bundled-binaries) below)

On Windows you also need the [MSVC build tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (included in Visual Studio 2019+).

### Install dependencies

```bash
npm install
```

### Development

```bash
npm run tauri dev
```

### Production build

```bash
npm run tauri build
```

Installers are written to `src-tauri/target/release/bundle/`.

---

## Bundled binaries

FFkit bundles ffmpeg/ffprobe as sidecars — it never uses the system-installed version.  
Place platform-specific binaries in `src-tauri/binaries/`:

| Platform | Files |
|---|---|
| Windows x86-64 | `ffmpeg-x86_64-pc-windows-msvc.exe` `ffprobe-x86_64-pc-windows-msvc.exe` |
| macOS ARM | `ffmpeg-aarch64-apple-darwin` `ffprobe-aarch64-apple-darwin` |
| macOS Intel | `ffmpeg-x86_64-apple-darwin` `ffprobe-x86_64-apple-darwin` |
| Linux x86-64 | `ffmpeg-x86_64-unknown-linux-gnu` `ffprobe-x86_64-unknown-linux-gnu` |

**Download sources (GPL full builds with x264/x265/vpx/opus):**

- **Windows / Linux**: [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds/releases) — pick `ffmpeg-master-latest-win64-gpl` or `linux64-gpl`
- **macOS**: [evermeet.cx](https://evermeet.cx/ffmpeg/) — pick the static GPL build

The binaries directory is in `.gitignore`; each developer/CI runner must provide them.

---

## CI / Release

GitHub Actions builds all three platforms on tag push. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

**Code signing** is scaffolded but not required for milestone 1. Set these environment variables in your CI/CD secrets to enable signing:

| Variable | Purpose |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri updater signing key (base64) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Key passphrase |
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

The updater endpoint is set to a placeholder:

```
https://updates.ffkit.example/{{target}}/{{current_version}}
```

To host your own update server, implement the [Tauri updater JSON response format](https://tauri.app/plugin/updater/) at that URL, or use a service like `tauri-update-server`.

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
│   ├── binaries/            Bundled ffmpeg/ffprobe (gitignored)
│   ├── src/
│   │   ├── commands/        Tauri IPC commands
│   │   ├── ffmpeg/          Process management, progress parsing, presets
│   │   ├── state.rs         Shared app state
│   │   └── lib.rs
│   └── tauri.conf.json
└── .github/workflows/ci.yml
```

## License

GPL-3.0 — required because the bundled ffmpeg builds are GPL-licensed.
