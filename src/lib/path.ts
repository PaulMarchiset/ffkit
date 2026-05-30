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

export function defaultOutputPath(
  inputPath: string,
  namingPattern: string,
  folderOverride?: string,
): string {
  const sep = pathSeparator(inputPath);
  const dir = folderOverride ?? parentDir(inputPath);
  const name = stripExtension(basename(inputPath));
  const outName = namingPattern.replace("{name}", name);
  return `${dir}${sep}${outName}.mp4`;
}
