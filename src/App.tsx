import { useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { SimpleMode } from "@/components/SimpleMode";
import { JobProgress } from "@/components/JobProgress";
import { JobsDock } from "@/components/JobsDock";
import { SettingsPanel } from "@/components/Settings";
import { EncoderBadge } from "@/components/EncoderBadge";
import { FFKitLogo } from "@/components/icons/FFKitLogo";
import { BookIcon } from "@/components/icons/BookIcon";
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

  function handleJobStart(jobId: string, outputPath: string) {
    setActiveJob({ id: jobId, outputPath });
    setShowProgress(true);
  }

  function handleSelectJob(jobId: string, outputPath: string) {
    setActiveJob({ id: jobId, outputPath });
    setShowProgress(true);
  }

  const dockJobs =
    showProgress && activeJob
      ? allJobs.filter((j) => j.id !== activeJob.id)
      : allJobs;

  const isSettings = view === "settings";

  return (
    <div className="dark min-h-screen bg-bg text-fg flex flex-col">
      <header className="flex items-center justify-between px-7 py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <FFKitLogo />
          <EncoderBadge loading={encoderLoading} encoders={encoders} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setView(isSettings ? "main" : "settings")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md border text-sm transition-colors",
              isSettings
                ? "border-accent/50 text-accent bg-accent/10"
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
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full px-7 py-4 flex flex-col justify-center">
          {showProgress && activeJob ? (
            <JobProgress
              jobId={activeJob.id}
              outputPath={activeJob.outputPath}
              onBack={() => setShowProgress(false)}
            />
          ) : view === "settings" ? (
            <SettingsPanel onBack={() => setView("main")} />
          ) : (
            <SimpleMode onJobStart={handleJobStart} />
          )}
        </div>
      </main>

      <JobsDock
        jobs={dockJobs}
        onDismiss={dismissJob}
        onSelect={handleSelectJob}
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
