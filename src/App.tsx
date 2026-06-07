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

type View = "main" | "settings";

function AppShell() {
  const [view, setView] = useState<View>("main");
  const [activeJob, setActiveJob] = useState<{ id: string; outputPath: string } | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const { encoders, encoderLoading } = useAppBootstrap();
  const { jobs: allJobs, dismiss: dismissJob } = useJobsList();

  // Open the progress view for a job — whether it was just started (SimpleMode)
  // or picked from the dock (JobsDock). Both call sites share this behavior.
  function showJobProgress(jobId: string, outputPath: string) {
    setActiveJob({ id: jobId, outputPath });
    setShowProgress(true);
  }

  const dockJobs =
    showProgress && activeJob
      ? allJobs.filter((j) => j.id !== activeJob.id)
      : allJobs;

  const isSettings = view === "settings";

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
          {showProgress && activeJob ? (
            <JobProgress
              jobId={activeJob.id}
              outputPath={activeJob.outputPath}
              onBack={() => setShowProgress(false)}
            />
          ) : view === "settings" ? (
            <SettingsPanel onBack={() => setView("main")} />
          ) : (
            <SimpleMode onJobStart={showJobProgress} />
          )}
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
