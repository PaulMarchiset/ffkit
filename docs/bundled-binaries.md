# Bundled binaries

FFkit ships as a single installer that contains:

## 1. The FFkit app
The Electron-based desktop UI. Source: this repository. License: [see LICENSE](../LICENSE).

## 2. FFmpeg 8.1 (sidecar)
A copy of FFmpeg is bundled inside the app package and invoked as a child
process. It is **not** installed system-wide, never added to your PATH, and
is removed when you uninstall FFkit.

- **Version:** 8.1
- **Build:** GPL (libx264, libx265, libvpx, libopus, libmp3lame, libvorbis enabled)
- **Source builds:**
  - macOS (arm64 + x64): https://www.osxexperts.net/ or https://evermeet.cx/ffmpeg/
  - Windows (x64): https://www.gyan.dev/ffmpeg/builds/ (full GPL build)
  - Linux (x64): https://johnvansickle.com/ffmpeg/ (static GPL build)
- **License:** GPL v3 — full text at https://www.gnu.org/licenses/gpl-3.0.html
- **Upstream source code:** https://ffmpeg.org/download.html

Because the GPL build is statically linked with GPL components, the bundled
FFmpeg binary is distributed under GPL v3. You can obtain the exact source
used to build each platform's binary from the links above.

## What FFkit does NOT install
- No system-wide `ffmpeg` command
- No background services or daemons
- No telemetry, analytics, or crash reporters
- No browser extensions or shell integrations

The only network traffic FFkit makes is the once-a-day update check
(toggleable in Settings).

## Uninstalling
Removing FFkit through your OS uninstaller (or dragging the .app to Trash on
macOS) deletes the app and the bundled FFmpeg. Your user preferences live in:

- **macOS:** `~/Library/Application Support/FFkit/`
- **Windows:** `%APPDATA%\FFkit\`
- **Linux:** `~/.config/FFkit/`

Delete those folders to remove preferences as well.
