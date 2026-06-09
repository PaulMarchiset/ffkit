import { useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { SimpleMode } from "@/components/SimpleMode";
import { JobProgress } from "@/components/JobProgress";
import { JobsDock } from "@/components/JobsDock";
import { SettingsPanel } from "@/components/Settings";
import { EncoderBadge } from "@/components/EncoderBadge";
import { FFKitLogo } from "@/components/icons/FFKitLogo";
import { BookIcon } from "@/components/icons/BookIcon";
import { WindowControls } from "@/components/WindowControls";
import { filesService } from "@/lib/services/filesService";
import { JobsProvider, useJobsList } from "@/lib/jobsContext";
import { useAppBootstrap } from "@/lib/useAppBootstrap";
import { SettingsProvider } from "@/lib/settingsContext";
import { cn } from "@/lib/cn";
import type { JobInputMeta } from "@/lib/types";

type View = "main" | "settings";

function AppShell() {
  const [view, setView] = useState<View>("main");
  const [activeJob, setActiveJob] = useState<{
    id: string;
    outputPath: string;
    input?: JobInputMeta;
  } | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  // Bumped to ask the (persistent) converter to clear its selected media while
  // keeping quality/advanced settings — see "Convert another" below.
  const [resetNonce, setResetNonce] = useState(0);
  const { encoders, encoderLoading } = useAppBootstrap();
  const { jobs: allJobs, dismiss: dismissJob } = useJobsList();

  // Open the progress view for a job — whether it was just started (SimpleMode,
  // which forwards input metadata for the result card) or picked from the dock
  // (JobsDock, where that metadata isn't available).
  function showJobProgress(jobId: string, outputPath: string, input?: JobInputMeta) {
    setActiveJob({ id: jobId, outputPath, input });
    setShowProgress(true);
  }

  // "Convert another" on a finished job: return to the converter and clear the
  // media so it's ready for a new file (settings are preserved).
  function handleConvertAnother() {
    setShowProgress(false);
    setResetNonce((n) => n + 1);
  }

  const dockJobs =
    showProgress && activeJob
      ? allJobs.filter((j) => j.id !== activeJob.id)
      : allJobs;

  const isSettings = view === "settings";
  // The main converter view is visible only when neither the progress view nor
  // settings is showing; otherwise it's kept mounted but hidden (see <main>).
  const showMain = !(showProgress && activeJob) && !isSettings;

  return (
    <div className="dark h-screen bg-bg text-fg flex flex-col">
      <header
        data-tauri-drag-region
        className="flex items-center h-16 pl-7 flex-shrink-0 select-none"
      >
        <div data-tauri-drag-region className="flex items-center gap-3">
          <span data-tauri-drag-region className="pointer-events-none">
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
            Settings
          </button>

          <button
            onClick={() => filesService.openUrl("https://ffmpeg.org/documentation.html")}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-border-strong text-sm text-fg hover:bg-white/5 transition-colors"
          >
            <BookIcon />
            Documentation
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
            <SimpleMode onJobStart={showJobProgress} resetNonce={resetNonce} />
          </div>
          {showProgress && activeJob ? (
            <JobProgress
              jobId={activeJob.id}
              outputPath={activeJob.outputPath}
              inputMeta={activeJob.input}
              onBack={() => setShowProgress(false)}
              onConvertAnother={handleConvertAnother}
            />
          ) : view === "settings" ? (
            <SettingsPanel onBack={() => setView("main")} />
          ) : null}
        </div>
      </main>

      <JobsDock
        jobs={dockJobs}
        onDismiss={dismissJob}
        onSelect={showJobProgress}
      />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <JobsProvider>
        <AppShell />
      </JobsProvider>
    </SettingsProvider>
  );
}
