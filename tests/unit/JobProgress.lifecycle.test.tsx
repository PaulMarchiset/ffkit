import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { JobProgress } from "@/components/JobProgress";
import { __tauriMock } from "@/test/mocks/tauri";

function flush() {
  // Two microtask ticks to drain the Promise.all in JobProgress's cleanup.
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("JobProgress — event listener lifecycle (D2 baseline)", () => {
  beforeEach(() => {
    __tauriMock.resetInvokeResponses();
  });

  it("subscribes to job-progress, job-done, and job-log on mount", async () => {
    render(<JobProgress jobId="J1" outputPath="/tmp/out.mp4" onBack={() => {}} />);
    await flush();
    expect(__tauriMock.listenerCount("job-progress")).toBe(1);
    expect(__tauriMock.listenerCount("job-done")).toBe(1);
    expect(__tauriMock.listenerCount("job-log")).toBe(1);
  });

  it("unsubscribes all three on unmount", async () => {
    const { unmount } = render(
      <JobProgress jobId="J2" outputPath="/tmp/out.mp4" onBack={() => {}} />,
    );
    await flush();
    expect(__tauriMock.listenerCount("job-progress")).toBe(1);

    unmount();
    await flush();
    await flush();

    expect(__tauriMock.listenerCount("job-progress")).toBe(0);
    expect(__tauriMock.listenerCount("job-done")).toBe(0);
    expect(__tauriMock.listenerCount("job-log")).toBe(0);
  });

  it("renders progress events for the matching jobId", async () => {
    render(<JobProgress jobId="J3" outputPath="/tmp/out.mp4" onBack={() => {}} />);
    await flush();
    await act(async () => {
      __tauriMock.emit("job-progress", {
        jobId: "J3",
        frame: 100,
        fps: 60,
        speed: 2,
        outTimeMs: 5000,
        totalSize: 1024,
        percentage: 42.5,
        etaSecs: 10,
        done: false,
      });
    });
    expect(screen.getByText("42.5%")).toBeInTheDocument();
  });

  it("ignores events meant for a different jobId", async () => {
    render(<JobProgress jobId="J4" outputPath="/tmp/out.mp4" onBack={() => {}} />);
    await flush();
    await act(async () => {
      __tauriMock.emit("job-progress", {
        jobId: "DIFFERENT",
        frame: 0,
        fps: 0,
        speed: 0,
        outTimeMs: 0,
        totalSize: 0,
        percentage: 88.8,
        etaSecs: 0,
        done: false,
      });
    });
    expect(screen.queryByText("88.8%")).not.toBeInTheDocument();
  });

  it("renders the done state when job-done arrives", async () => {
    render(<JobProgress jobId="J5" outputPath="/tmp/out.mp4" onBack={() => {}} />);
    await flush();
    await act(async () => {
      __tauriMock.emit("job-done", {
        jobId: "J5",
        success: true,
        cancelled: false,
        outputPath: "/tmp/out.mp4",
        error: null,
      });
    });
    expect(screen.getByText("Done.")).toBeInTheDocument();
  });

  it("documents the D2 race: events fired after unmount before unlisten resolves still hit registered listeners", async () => {
    const { unmount } = render(
      <JobProgress jobId="J6" outputPath="/tmp/out.mp4" onBack={() => {}} />,
    );
    await flush();
    expect(__tauriMock.listenerCount("job-progress")).toBe(1);

    unmount();
    // Synchronously after unmount, before microtasks drain, listeners
    // are still registered — this is the D2 race that Phase 3 will close.
    expect(__tauriMock.listenerCount("job-progress")).toBe(1);

    await flush();
    await flush();
    expect(__tauriMock.listenerCount("job-progress")).toBe(0);
  });
});
