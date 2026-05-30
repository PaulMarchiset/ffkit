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
