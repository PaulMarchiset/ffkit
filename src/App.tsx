import { useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { SimpleMode } from "@/components/SimpleMode";
import { JobProgress } from "@/components/JobProgress";
import { BatchProgress } from "@/components/BatchProgress";
import { JobsDock } from "@/components/JobsDock";
import { SettingsPanel } from "@/components/Settings";
import { EncoderBadge } from "@/components/EncoderBadge";
import { FFKitLogo } from "@/components/icons/FFKitLogo";
import { BookIcon } from "@/components/icons/BookIcon";
import { WindowControls } from "@/components/WindowControls";
import { UpdateBanner } from "@/components/UpdateBanner";
import { filesService } from "@/lib/services/filesService";
import { JobsProvider, useJobsList } from "@/lib/jobsContext";
import { useAppBootstrap } from "@/lib/useAppBootstrap";
import { SettingsProvider } from "@/lib/settingsContext";
import { UpdaterProvider } from "@/lib/updaterContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import type { BatchItem, JobInputMeta } from "@/lib/types";

type View = "main" | "settings";

function AppShell() {
  const [view, setView] = useState<View>("main");
  const [activeJob, setActiveJob] = useState<{
    id: string;
    outputPath: string;
    input?: JobInputMeta;
  } | null>(null);
  // The active batch persists while its jobs run; `showBatch` toggles whether
  // its progress screen is on-screen — so "Run in background" hides the view but
  // keeps the batch reopenable from the dock.
  const [activeBatch, setActiveBatch] = useState<BatchItem[] | null>(null);
  const [showBatch, setShowBatch] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  // Bumped to ask the (persistent) converter to clear its selected media while
  // keeping quality/advanced settings — see "Convert another" below.
  const [resetNonce, setResetNonce] = useState(0);
  const { encoders, encoderLoading } = useAppBootstrap();
  const { jobs: allJobs, dismiss: dismissJob } = useJobsList();
  const { t } = useTranslation();

  // Open the progress view for a job — whether it was just started (SimpleMode,
  // which forwards input metadata for the result card) or picked from the dock
  // (JobsDock, where that metadata isn't available).
  function showJobProgress(jobId: string, outputPath: string, input?: JobInputMeta) {
    setActiveJob({ id: jobId, outputPath, input });
    setShowProgress(true);
  }

  // Open the batch progress screen for a freshly-started preset batch.
  function showBatchProgress(items: BatchItem[]) {
    setActiveBatch(items);
    setShowBatch(true);
  }

  // Dock click: reopen the batch screen if the picked job belongs to the active
  // batch, otherwise open the single-job progress view.
  function handleDockSelect(jobId: string, outputPath: string) {
    if (activeBatch?.some((b) => b.jobId === jobId)) {
      setShowBatch(true);
    } else {
      showJobProgress(jobId, outputPath);
    }
  }

  // "Run in background" for a batch: hide its screen but keep the batch alive so
  // the dock can reopen it; free the drop space for a new file.
  function backgroundBatch() {
    setShowBatch(false);
    setResetNonce((n) => n + 1);
  }

  // Return to the converter with a fresh drop zone — clears the selected media
  // (quality/advanced settings are preserved). Shared by "Run in background"
  // (job keeps running, tracked in the dock) and "Convert another" (finished
  // job), so leaving the progress view always frees the drop space for a new file.
  function returnToConverter() {
    setShowProgress(false);
    setActiveBatch(null);
    setShowBatch(false);
    setResetNonce((n) => n + 1);
  }

  // Jobs shown in their own progress view are excluded from the dock to avoid
  // double-listing (the single active job, or every job in the on-screen batch).
  const hiddenJobIds = new Set<string>(
    showBatch && activeBatch ? activeBatch.map((b) => b.jobId) : [],
  );
  if (showProgress && activeJob) hiddenJobIds.add(activeJob.id);
  const dockJobs = allJobs.filter((j) => !hiddenJobIds.has(j.id));

  const isSettings = view === "settings";
  // The main converter view is visible only when no progress/batch view nor
  // settings is showing; otherwise it's kept mounted but hidden (see <main>).
  const showMain = !(showProgress && activeJob) && !showBatch && !isSettings;

  return (
    <div className="h-screen bg-bg text-fg flex flex-col">
      <header
        data-tauri-drag-region
        className="flex items-center h-16 pl-7 flex-shrink-0 select-none"
      >
        <div data-tauri-drag-region className="flex items-center gap-3">
          <span data-tauri-drag-region className="pointer-events-none text-fg">
            <FFKitLogo />
          </span>
          <EncoderBadge loading={encoderLoading} encoders={encoders} />
        </div>

        <div data-tauri-drag-region className="flex-1 self-stretch" />

        <div className="flex items-center gap-3 pr-3">
          <button
            onClick={() => setView(isSettings ? "main" : "settings")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md border text-sm transition-colors",
              isSettings
                ? "border-transparent text-fg bg-surface-2"
                : "border-border-strong text-fg hover:bg-white/5",
            )}
          >
            <SettingsIcon className="w-4 h-4" />
            {t("common.settings")}
          </button>

          <button
            onClick={() => filesService.openUrl("https://ffmpeg.org/documentation.html")}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-border-strong text-sm text-fg hover:bg-white/5 transition-colors"
          >
            <BookIcon />
            {t("common.documentation")}
          </button>
        </div>

        <WindowControls />
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div className="mx-auto w-full px-7 pt-4 pb-[10vh]">
          {/* SimpleMode stays mounted and is merely hidden behind Settings /
              JobProgress, so the dropped clip and ffmpeg command/parameter
              state survive navigating away and back. */}
          <div className={cn(showMain ? undefined : "hidden")}>
            <SimpleMode
              onBatchStart={showBatchProgress}
              onJobStart={showJobProgress}
              resetNonce={resetNonce}
            />
          </div>
          {/* Settings takes precedence over the progress views so it can be
              opened from any screen; closing it (view → "main") falls back to
              the still-active batch / single job. */}
          {view === "settings" ? (
            <SettingsPanel onBack={() => setView("main")} />
          ) : showBatch && activeBatch ? (
            <BatchProgress
              items={activeBatch}
              onBack={backgroundBatch}
              onConvertAnother={returnToConverter}
            />
          ) : showProgress && activeJob ? (
            <JobProgress
              jobId={activeJob.id}
              outputPath={activeJob.outputPath}
              inputMeta={activeJob.input}
              onBack={returnToConverter}
              onConvertAnother={returnToConverter}
            />
          ) : null}
        </div>
      </main>

      <JobsDock
        jobs={dockJobs}
        onDismiss={dismissJob}
        onSelect={handleDockSelect}
      />

      <UpdateBanner />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <UpdaterProvider>
        <JobsProvider>
          <AppShell />
        </JobsProvider>
      </UpdaterProvider>
    </SettingsProvider>
  );
}
