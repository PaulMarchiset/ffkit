import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCommandArgs } from "@/lib/shellArgs";
import { buildCommandArgs } from "@/lib/commandBuilder";

// Shared parity fixture, replayed here (TS) and — in Phase B — in Rust.
// `expected` is the source of truth: today's TS output. These tests must be
// green on the CURRENT code before any logic is moved to Rust.
interface TokenizerCase {
  name: string;
  input: string;
  expected: string[];
}
interface BuildCase {
  name: string;
  template: string;
  input: string;
  output: string;
  expected: string[];
}
interface Fixture {
  tokenizer: TokenizerCase[];
  buildRawArgs: BuildCase[];
}

// Vitest runs with cwd = repo root.
const fixture: Fixture = JSON.parse(
  readFileSync(
    join(process.cwd(), "tests/fixtures/ffmpeg-raw-args-cases.json"),
    "utf8",
  ),
);

describe("parseCommandArgs — frozen current behavior", () => {
  for (const c of fixture.tokenizer) {
    it(c.name, () => {
      expect(parseCommandArgs(c.input)).toEqual(c.expected);
    });
  }
});

describe("buildCommandArgs — frozen current behavior", () => {
  for (const c of fixture.buildRawArgs) {
    it(c.name, () => {
      expect(buildCommandArgs(c.template, c.input, c.output)).toEqual(c.expected);
    });
  }
});
