// Generates the NSIS installer artwork (24-bit BMP) in the app's own visual
// style: near-black background (#1A1A18), the real FFkit logo lockup, and a
// green accent rule (#518B2E). "Minimal top mark" layout.
//
// No image library is needed: we rasterise with the Canvas 2D API inside the
// Playwright Chromium that already ships for e2e, read back the raw pixels,
// and write the BMP header by hand. Run with:  node scripts/gen-installer-art.mjs
//
// Outputs (relative to src-tauri/, where tauri.conf.json resolves paths):
//   installer/sidebar.bmp  164x314  — NSIS welcome/finish left panel
//   installer/header.bmp   150x57   — NSIS inner-page header tile
// Plus *.png siblings purely as human-previewable copies (not used by Tauri).

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src-tauri/installer");

// The exact logo lockup from public/icon.svg + src/components/icons/FFKitLogo.tsx
// (viewBox 0 0 103 28). D1 is the zig-zag mark (stroked); D2 is the wordmark (filled).
const VB_W = 103;
const VB_H = 28;
const D1 =
  "M3.56486 1.5H10.1975L3.56486 8.67403V16.7956L19.1312 1.5H27.5234L3.56486 26H12.0925L27.5234 10.7044V19.0967L20.8908 26H27.5234";
const D2 =
  "M48.1394 6.286V12.422H51.7274C52.7414 12.422 53.0014 11.564 53.0014 10.602C53.1574 10.576 53.2874 10.576 53.4174 10.576C53.6514 10.576 53.9114 10.628 54.1194 10.784C54.0674 11.642 54.0414 12.526 54.0414 13.41C54.0414 14.216 54.0674 15.048 54.1194 15.88C53.9374 16.036 53.6254 16.114 53.3394 16.114C53.2094 16.114 53.1054 16.088 53.0014 16.062C53.0014 14.996 52.6634 13.982 51.7274 13.982H48.1394V19.936C48.1394 20.326 48.1654 20.716 48.5034 20.82C49.4394 21.132 50.4794 21.106 51.4154 21.236C51.4154 21.834 51.1814 22.25 51.1814 22.25H43.9014C43.9014 22.25 43.6414 21.834 43.6414 21.236C44.1094 21.158 44.7854 20.898 45.1494 20.534C45.4874 20.196 45.5654 19.884 45.5654 18.766V7.066C45.5654 6.702 45.5134 6.286 45.0974 6.13C44.5514 5.922 43.6154 5.792 43.5634 5.792C43.5634 5.142 43.8234 4.752 43.8234 4.752H56.1734C56.2254 6.494 56.6674 9.12 56.6674 9.12C56.6674 9.12 56.3554 9.38 55.7834 9.38C55.6794 9.38 55.6014 9.38 55.4974 9.354C55.3414 7.95 54.6914 6.702 53.7554 6.416C53.1574 6.234 52.2474 6.208 51.3374 6.208C50.1414 6.208 49.1534 6.286 48.1394 6.286ZM62.6629 6.286V12.422H66.2509C67.2649 12.422 67.5249 11.564 67.5249 10.602C67.6809 10.576 67.8109 10.576 67.9409 10.576C68.1749 10.576 68.4349 10.628 68.6429 10.784C68.5909 11.642 68.5649 12.526 68.5649 13.41C68.5649 14.216 68.5909 15.048 68.6429 15.88C68.4609 16.036 68.1489 16.114 67.8629 16.114C67.7329 16.114 67.6289 16.088 67.5249 16.062C67.5249 14.996 67.1869 13.982 66.2509 13.982H62.6629V19.936C62.6629 20.326 62.6889 20.716 63.0269 20.82C63.9629 21.132 65.0029 21.106 65.9389 21.236C65.9389 21.834 65.7049 22.25 65.7049 22.25H58.4249C58.4249 22.25 58.1649 21.834 58.1649 21.236C58.6329 21.158 59.3089 20.898 59.6729 20.534C60.0109 20.196 60.0889 19.884 60.0889 18.766V7.066C60.0889 6.702 60.0369 6.286 59.6209 6.13C59.0749 5.922 58.1389 5.792 58.0869 5.792C58.0869 5.142 58.3469 4.752 58.3469 4.752H70.6969C70.7489 6.494 71.1909 9.12 71.1909 9.12C71.1909 9.12 70.8789 9.38 70.3069 9.38C70.2029 9.38 70.1249 9.38 70.0209 9.354C69.8649 7.95 69.2149 6.702 68.2789 6.416C67.6809 6.234 66.7709 6.208 65.8609 6.208C64.6649 6.208 63.6769 6.286 62.6629 6.286ZM72.3763 22.25C72.3763 22.25 72.1163 21.938 72.1163 21.34C73.4423 21.106 74.0403 20.69 74.0403 19.104V6.468C74.0403 5.142 73.7023 4.752 72.1423 4.752C72.1163 4.7 71.9863 4.466 71.9863 4.05C71.9863 3.946 71.9863 3.842 72.0123 3.738C73.2863 3.816 74.7163 3.608 75.9643 3.322C76.5103 3.764 76.5103 4.024 76.5103 6.182V15.048H76.5623C76.9003 15.048 80.5663 11.59 80.5663 11.07C80.5663 10.862 80.2803 10.81 79.0583 10.602C79.0583 10.602 79.0323 10.108 79.3183 9.692H84.7003C84.9863 10.082 84.9603 10.602 84.9603 10.602C84.1803 10.732 83.5823 10.784 83.2963 10.914C82.3343 11.356 79.2143 14.398 78.9283 14.658C79.9943 16.114 82.0483 18.792 83.2443 20.274C83.8943 21.132 84.7783 21.236 85.4283 21.34C85.4283 21.86 85.2463 22.12 85.1683 22.25H81.9183C81.9183 22.25 77.4983 16.556 77.1603 16.14C77.0043 15.958 76.7703 15.88 76.5103 15.906V20.118C76.5103 21.184 77.7063 21.184 78.3823 21.34C78.3823 21.938 78.1483 22.25 78.1483 22.25H72.3763ZM92.0703 22.25H85.9863C85.9863 22.25 85.7263 21.938 85.7263 21.34C86.4543 21.21 86.9223 20.924 87.2343 20.638C87.5203 20.378 87.6503 19.962 87.6503 19.104V12.89C87.6503 11.356 87.0263 11.174 85.7523 11.174C85.7523 11.174 85.5963 10.94 85.5963 10.472C85.5963 10.368 85.5963 10.29 85.6223 10.16C87.2863 10.03 88.2483 9.718 89.6003 9.25C90.1463 9.666 90.1723 10.108 90.1723 11.46V20.118C90.1723 20.612 90.2243 20.82 90.5103 20.924C90.8223 21.054 91.2383 21.132 92.3303 21.34C92.3303 21.938 92.0703 22.25 92.0703 22.25ZM90.1203 4.934C90.1203 5.896 89.4183 6.624 88.4823 6.624C87.5723 6.624 86.8443 5.896 86.8443 4.934C86.8443 4.024 87.5723 3.296 88.4823 3.296C89.4183 3.296 90.1203 4.024 90.1203 4.934ZM95.091 18.584V11.174H93.219C93.219 11.174 92.907 10.368 93.193 9.692C95.299 9.302 95.741 8.106 95.741 6.26C95.975 5.792 96.729 5.402 97.613 5.714V9.588H100.837C101.019 10.134 100.993 10.628 100.837 11.174H97.613V17.388C97.613 19.52 97.613 20.69 98.679 20.69C99.381 20.69 100.265 20.56 101.175 20.274C101.253 20.378 101.279 20.482 101.279 20.612C101.279 21.678 99.225 22.562 97.769 22.562C95.689 22.562 95.091 21.548 95.091 18.584Z";

const BG = "#1A1A18";
const ACCENT = "#518B2E";
const MARK = "#FFFFFF";

// Each spec: canvas size + where to drop the lockup and the accent rule.
const SPECS = [
  {
    name: "sidebar",
    w: 164,
    h: 314,
    lockup: { x: 18, y: 30, targetW: 120 },
    rule: { x: 18, gapBelowLockup: 14, w: 46, h: 2 },
  },
  {
    name: "header",
    w: 150,
    h: 57,
    lockup: { x: 18, y: null /* vertically centered */, targetW: 110 },
    rule: null, // too small to add a rule cleanly
  },
];

// Returns { rgba: number[] (w*h*4, top-down), pngDataUrl: string }.
async function render(page, spec) {
  return page.evaluate(
    ({ spec, D1, D2, VB_W, VB_H, BG, ACCENT, MARK }) => {
      const cv = document.createElement("canvas");
      cv.width = spec.w;
      cv.height = spec.h;
      const ctx = cv.getContext("2d");

      // Background
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, spec.w, spec.h);

      // Logo lockup
      const s = spec.lockup.targetW / VB_W;
      const renderedH = VB_H * s;
      const ly =
        spec.lockup.y == null ? Math.round((spec.h - renderedH) / 2) : spec.lockup.y;
      ctx.save();
      ctx.translate(spec.lockup.x, ly);
      ctx.scale(s, s);
      const p1 = new Path2D(D1);
      ctx.strokeStyle = MARK;
      ctx.lineWidth = 3;
      ctx.lineCap = "square";
      ctx.lineJoin = "miter";
      ctx.miterLimit = 4;
      ctx.stroke(p1);
      const p2 = new Path2D(D2);
      ctx.fillStyle = MARK;
      ctx.fill(p2);
      ctx.restore();

      // Accent rule
      if (spec.rule) {
        ctx.fillStyle = ACCENT;
        ctx.fillRect(
          spec.rule.x,
          Math.round(ly + renderedH + spec.rule.gapBelowLockup),
          spec.rule.w,
          spec.rule.h
        );
      }

      const data = ctx.getImageData(0, 0, spec.w, spec.h).data;
      return { rgba: Array.from(data), pngDataUrl: cv.toDataURL("image/png") };
    },
    { spec, D1, D2, VB_W, VB_H, BG, ACCENT, MARK }
  );
}

// Pack top-down RGBA into an uncompressed 24-bit (BGR, bottom-up) BMP buffer.
function rgbaToBmp24(rgba, w, h) {
  const rowSize = Math.floor((24 * w + 31) / 32) * 4; // padded to 4 bytes
  const pixelBytes = rowSize * h;
  const fileSize = 54 + pixelBytes;
  const buf = Buffer.alloc(fileSize);

  // BITMAPFILEHEADER
  buf.write("BM", 0, "ascii");
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10); // pixel data offset
  // BITMAPINFOHEADER
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(w, 18);
  buf.writeInt32LE(h, 22); // positive => bottom-up
  buf.writeUInt16LE(1, 26); // planes
  buf.writeUInt16LE(24, 28); // bpp
  buf.writeUInt32LE(0, 30); // BI_RGB, no compression
  buf.writeUInt32LE(pixelBytes, 34);
  buf.writeInt32LE(2835, 38); // ~72 DPI
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  for (let y = 0; y < h; y++) {
    const srcRow = (h - 1 - y) * w * 4; // flip vertically
    let dst = 54 + y * rowSize;
    for (let x = 0; x < w; x++) {
      const si = srcRow + x * 4;
      buf[dst++] = rgba[si + 2]; // B
      buf[dst++] = rgba[si + 1]; // G
      buf[dst++] = rgba[si]; // R
    }
  }
  return buf;
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><html><body></body></html>");

for (const spec of SPECS) {
  const { rgba, pngDataUrl } = await render(page, spec);
  const bmp = rgbaToBmp24(rgba, spec.w, spec.h);
  writeFileSync(resolve(OUT, `${spec.name}.bmp`), bmp);
  writeFileSync(
    resolve(OUT, `${spec.name}.png`),
    Buffer.from(pngDataUrl.split(",")[1], "base64")
  );
  console.log(`  ${spec.name}: ${spec.w}x${spec.h}  (${bmp.length} bytes)`);
}

await browser.close();
console.log("Installer art written to src-tauri/installer/");
