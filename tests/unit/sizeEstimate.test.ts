import { describe, it, expect } from "vitest";
import { estimateSizeRange } from "@/lib/sizeEstimate";
import type { FileInfo } from "@/lib/types";

const base: FileInfo = {
  path: "C:\\videos\\sample.mp4",
  name: "sample.mp4",
  size: 100_000_000,
  duration: 100,
  width: 1920,
  height: 1080,
  fps: 30,
};

describe("estimateSizeRange", () => {
  it("returns null without a usable duration", () => {
    expect(estimateSizeRange({ ...base, duration: undefined }, "medium")).toBeNull();
    expect(estimateSizeRange({ ...base, duration: 0 }, "medium")).toBeNull();
  });

  it("produces a min<max band straddling the central estimate", () => {
    const r = estimateSizeRange(base, "medium")!;
    expect(r.min).toBeGreaterThan(0);
    expect(r.max).toBeGreaterThan(r.min);
    // ±50% band → max/min ratio is (1+0.5)/(1-0.5) = 3.
    expect(r.max / r.min).toBeCloseTo(3, 5);
  });

  it("scales with quality: low < medium < lossless", () => {
    const low = estimateSizeRange(base, "low")!;
    const med = estimateSizeRange(base, "medium")!;
    const high = estimateSizeRange(base, "lossless")!;
    expect(low.max).toBeLessThan(med.max);
    expect(med.max).toBeLessThan(high.max);
  });

  it("scales linearly with duration", () => {
    const short = estimateSizeRange({ ...base, duration: 50 }, "medium")!;
    const long = estimateSizeRange({ ...base, duration: 100 }, "medium")!;
    expect(long.max / short.max).toBeCloseTo(2, 5);
  });

  it("falls back to sane defaults when dimensions/fps are missing", () => {
    const r = estimateSizeRange(
      { ...base, width: undefined, height: undefined, fps: undefined },
      "medium",
    );
    expect(r).not.toBeNull();
    expect(r!.max).toBeGreaterThan(0);
  });
});
