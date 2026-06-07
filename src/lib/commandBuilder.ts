// NOTE: as of the Rust port, raw-mode argument construction happens in the
// backend (src-tauri/src/ffmpeg/raw_args.rs). This module is no longer on the
// execution path — it is retained as the frozen TS reference that the parity
// fixture/tests pin the Rust behavior against (tests/unit/rawArgs.parity.test.ts),
// and as a building block for the command preview. Keep behavior frozen.
import { parseCommandArgs } from "@/lib/shellArgs";

/** Replace {input}/{output} placeholders in a command template. */
function fillPlaceholders(template: string, inputPath: string, outputPath: string): string {
  return template
    .replace(/\{input\}/g, inputPath)
    .replace(/\{output\}/g, outputPath);
}

/** Drop a leading "ffmpeg" token — args are passed straight to the binary. */
function stripLeadingFfmpeg(args: string[]): string[] {
  return args[0]?.toLowerCase() === "ffmpeg" ? args.slice(1) : args;
}

/**
 * Turn a raw ffmpeg command template into the arg list handed to the backend:
 * fills {input}/{output}, splits on whitespace (respecting quotes), and drops
 * any leading "ffmpeg".
 */
export function buildCommandArgs(
  template: string,
  inputPath: string,
  outputPath: string,
): string[] {
  const filled = fillPlaceholders(template, inputPath, outputPath);
  return stripLeadingFfmpeg(parseCommandArgs(filled));
}
