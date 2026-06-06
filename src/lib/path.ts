import type { Quality } from "./types";

function pathSeparator(path: string): string {
  return path.includes("\\") ? "\\" : "/";
}

export function parentDir(path: string): string {
  const sep = pathSeparator(path);
  const idx = path.lastIndexOf(sep);
  return idx >= 0 ? path.slice(0, idx) : path;
}

export function basename(path: string): string {
  const sep = pathSeparator(path);
  const idx = path.lastIndexOf(sep);
  return idx >= 0 ? path.slice(idx + 1) : path;
}

function stripExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(0, dot) : filename;
}

/** Source file extension without the dot, lowercased (empty when none). */
function extension(filename: string): string {
  const base = basename(filename);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/** Local calendar date as YYYY-MM-DD. */
function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function defaultOutputPath(
  inputPath: string,
  namingPattern: string,
  folderOverride?: string,
  quality?: Quality,
): string {
  const sep = pathSeparator(inputPath);
  const dir = folderOverride ?? parentDir(inputPath);
  const name = stripExtension(basename(inputPath));
  // {ext} is the source extension — the output container is always .mp4.
  const outName = namingPattern
    .split("{name}").join(name)
    .split("{date}").join(formatDate(new Date()))
    .split("{quality}").join(quality ?? "")
    .split("{ext}").join(extension(inputPath));
  return `${dir}${sep}${outName}.mp4`;
}
