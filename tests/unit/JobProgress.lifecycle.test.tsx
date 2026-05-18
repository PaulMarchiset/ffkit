import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { JobProgress } from "@/components/JobProgress";
import { __tauriMock } from "@/test/mocks/tauri";

function flush() {
  // One microtask tick to drain the Promise.then in useJobEvents that pushes
  // unlisten fns into the cleanup list once `listen()` resolves.
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("JobProgress — event listener lifecycle (D2 closed)", () => {
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

  it("drops all three listeners synchronously on unmount", async () => {
    const { unmount } = render(
      <JobProgress jobId="J2" outputPath="/tmp/out.mp4" onBack={() => {}} />,
    );
    await flush();
    expect(__tauriMock.listenerCount("job-progress")).toBe(1);

    unmount();

    // Contract after D2 fix: unlisten runs synchronously inside cleanup,
    // no microtask drain required.
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

  it("unlisten that resolves after cleanup runs immediately (unmount-before-listen-resolves race)", async () => {
    // Don't flush before unmount — useEffect has run and the listener is
    // already in the mock's set (set.add happens synchronously inside the
    // async listen()), but the unlisten Promise hasn't settled yet, so the
    // unlistens[] array in useJobEvents is still empty.
    const { unmount } = render(
      <JobProgress jobId="J6" outputPath="/tmp/out.mp4" onBack={() => {}} />,
    );
    expect(__tauriMock.listenerCount("job-progress")).toBe(1);

    unmount();
    // Cleanup ran but unlistens[] was empty — listener still registered.
    expect(__tauriMock.listenerCount("job-progress")).toBe(1);

    // Once the listen() Promises resolve, the .then sees cancelled=true and
    // calls each unlisten immediately.
    await flush();
    expect(__tauriMock.listenerCount("job-progress")).toBe(0);
    expect(__tauriMock.listenerCount("job-done")).toBe(0);
    expect(__tauriMock.listenerCount("job-log")).toBe(0);
  });

  it("emit after unmount is a no-op (no listeners, no errors)", async () => {
    const { unmount } = render(
      <JobProgress jobId="J7" outputPath="/tmp/out.mp4" onBack={() => {}} />,
    );
    await flush();
    unmount();

    // After D2 fix the listener slot is empty, so emit just dispatches to
    // nobody. This guards against future regressions that re-introduce
    // dangling subscriptions.
    expect(() =>
      __tauriMock.emit("job-progress", {
        jobId: "J7",
        frame: 0,
        fps: 0,
        speed: 0,
        outTimeMs: 0,
        totalSize: 0,
        percentage: 99.9,
        etaSecs: 0,
        done: false,
      }),
    ).not.toThrow();
  });
});
