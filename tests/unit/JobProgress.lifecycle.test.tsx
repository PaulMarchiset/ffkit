import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { JobProgress } from "@/components/JobProgress";
import { JobsProvider } from "@/lib/jobsContext";
import { __tauriMock } from "@/test/mocks/tauri";

function flush() {
  // One microtask tick to drain the Promise.then in JobsProvider that pushes
  // unlisten fns into the cleanup list once `listen()` resolves, plus the
  // awaited list_jobs() refresh.
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function withProvider(node: ReactNode) {
  return <JobsProvider>{node}</JobsProvider>;
}

// A list_jobs() row so the provider seeds a job the progress view can read.
function seedJob(id: string) {
  __tauriMock.setInvokeResponse("list_jobs", () => [
    {
      id,
      inputPath: `/tmp/${id}.mov`,
      outputPath: "/tmp/out.mp4",
      state: "running",
      progress: 0,
      speed: 0,
      etaSecs: 0,
      outputSize: 0,
    },
  ]);
}

describe("Jobs event subscription lifecycle (D2 closed)", () => {
  beforeEach(() => {
    __tauriMock.resetInvokeResponses();
  });

  it("JobsProvider subscribes to job-progress, job-done, and job-log once on mount", async () => {
    render(withProvider(null));
    await flush();
    expect(__tauriMock.listenerCount("job-progress")).toBe(1);
    expect(__tauriMock.listenerCount("job-done")).toBe(1);
    expect(__tauriMock.listenerCount("job-log")).toBe(1);
  });

  it("drops all three listeners synchronously on unmount", async () => {
    const { unmount } = render(withProvider(null));
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
    seedJob("J3");
    render(
      withProvider(
        <JobProgress jobId="J3" outputPath="/tmp/out.mp4" onBack={() => {}} />,
      ),
    );
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
    // The meter rounds to a whole percent (mockup shows "12%", not "12.0%").
    expect(screen.getByText("43%")).toBeInTheDocument();
  });

  it("ignores events meant for a different jobId", async () => {
    seedJob("J4");
    render(
      withProvider(
        <JobProgress jobId="J4" outputPath="/tmp/out.mp4" onBack={() => {}} />,
      ),
    );
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
    render(
      withProvider(
        <JobProgress jobId="J5" outputPath="/tmp/out.mp4" onBack={() => {}} />,
      ),
    );
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
    // Don't flush before unmount — the effect has run and the listener is
    // already in the mock's set (set.add happens synchronously inside the
    // async listen()), but the unlisten Promise hasn't settled yet, so the
    // unlistens[] array in JobsProvider is still empty.
    const { unmount } = render(withProvider(null));
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
    const { unmount } = render(withProvider(null));
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
