# FFKit Landing Page Spec

This document describes what the marketing/download landing page should contain.
Build it as a separate static site (not inside this repo).

---

## Page structure

### Hero
- App name: **FFKit**
- Tagline: "The cleanest way to use ffmpeg."
- Sub-tagline: "No command line needed. Or go full command line if you want."
- Primary CTA: Download buttons (Windows / macOS / Linux), auto-detect OS
- Screenshot or short screen recording of simple mode in action

### Download section
Three platform buttons, each showing the installer type:
- **Windows** — `.exe` installer / `.msi` (link to GitHub Releases latest)
- **macOS** — `.dmg` (universal or per-arch)
- **Linux** — `.deb` / `.rpm` / `.AppImage`

Link to GitHub Releases for all versions / checksums.

### Features
Three columns:
1. **Simple mode** — Drop a file, pick Low/Medium/Lossless, hit Convert. Done.
2. **Advanced mode** — 15+ preset templates + raw ffmpeg command editor.
3. **Hardware acceleration** — Automatically uses your GPU (NVENC, VideoToolbox, QSV, AMF, VAAPI) when available.

### How it works
1. Drop your video (or click to browse).
2. Choose quality.
3. Click Convert.

Optional callout: "It runs native ffmpeg on your machine. No cloud. No uploads. No nonsense."

### FAQ
- **Does it require ffmpeg to be installed?** No — ffmpeg is bundled inside the app.
- **Is it free?** Yes. Open source under GPL-3.0.
- **Does it send data anywhere?** Only the auto-update check (optional, can be turned off). No telemetry.
- **What formats are supported?** Anything ffmpeg supports — MP4, MKV, MOV, WebM, AVI, and more.

### Footer
- Link to GitHub repo
- License: GPL-3.0
- "Made with Tauri + ffmpeg"
