import { useEffect, useRef, useState } from "react";
import { ArrowLeft, FolderOpen, Minus, Plus, RefreshCw } from "lucide-react";
import { pickOutputFolder } from "@/lib/dialogs";
import { systemService } from "@/lib/services/systemService";
import { updaterService } from "@/lib/services/updaterService";
import { useSettings } from "@/lib/settingsContext";
import type { Settings, Quality, HardwareAccel, UpdateChannel } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Section } from "./ui/Section";
import { Row } from "./ui/Row";
import { Select } from "./ui/Select";
import { Toggle } from "./ui/Toggle";
import { FeatherIcon, LuggageIcon, DiamondIcon } from "./icons/QualityIcons";

interface Props {
  onBack: () => void;
}

const QUALITY_SEGMENTS: { value: Quality; label: string; icon: React.ReactNode }[] = [
  { value: "low", label: "Low", icon: <FeatherIcon /> },
  { value: "medium", label: "Medium", icon: <LuggageIcon /> },
  { value: "lossless", label: "Lossless", icon: <DiamondIcon /> },
];

const HW_ACCEL_OPTIONS = [
  { value: "auto", label: "Auto (recommended)" },
  { value: "software", label: "Force software (libx264)" },
];

const UPDATE_CHANNEL_OPTIONS = [
  { value: "stable", label: "Stable" },
  { value: "beta", label: "Beta" },
];

const MIN_CONCURRENT = 1;
const MAX_CONCURRENT = 4;

const SAVED_BANNER_MS = 2000;

export function SettingsPanel({ onBack }: Props) {
  const { settings: persisted, saveSettings } = useSettings();
  // Local editable draft; seeded from the canonical settings and only pushed
  // back through the context on save.
  const [settings, setLocal] = useState<Settings | null>(persisted);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  type UpdateState =
    | { kind: "idle" }
    | { kind: "checking" }
    | { kind: "uptodate" }
    | { kind: "available"; version: string }
    | { kind: "installing"; progress: number }
    | { kind: "error"; message: string };
  const [updateState, setUpdateState] = useState<UpdateState>({ kind: "idle" });

  useEffect(() => {
    setLocal(persisted);
  }, [persisted]);

  useEffect(() => {
    systemService
      .appVersion()
      .then(setAppVersion)
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setLocal((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      await saveSettings(settings);
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), SAVED_BANNER_MS);
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckUpdates() {
    setUpdateState({ kind: "checking" });
    try {
      const update = await updaterService.check();
      if (!update) {
        setUpdateState({ kind: "uptodate" });
        return;
      }
      setUpdateState({ kind: "available", version: update.version });
      setUpdateState({ kind: "installing", progress: 0 });
      await updaterService.install(update, (fraction) =>
        setUpdateState({ kind: "installing", progress: fraction }),
      );
      // App relaunches on success; this line is effectively unreachable.
    } catch (err) {
      setUpdateState({ kind: "error", message: String(err) });
    }
  }

  async function handlePickFolder() {
    const folder = await pickOutputFolder();
    if (folder) update("outputFolder", folder);
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-40 text-muted text-sm">
        Loading…
      </div>
    );
  }

  const updateBusy =
    updateState.kind === "checking" || updateState.kind === "installing";

  const versionLabel = appVersion ? `FFkit ${appVersion}` : "FFkit";
  let updateStatus: React.ReactNode;
  switch (updateState.kind) {
    case "checking":
      updateStatus = `${versionLabel} — checking…`;
      break;
    case "uptodate":
      updateStatus = `${versionLabel} — up to date`;
      break;
    case "available":
      updateStatus = `${versionLabel} — v${updateState.version} available`;
      break;
    case "installing":
      updateStatus = `${versionLabel} — installing… ${Math.round(updateState.progress * 100)}%`;
      break;
    case "error":
      updateStatus = <span className="text-red-500">{updateState.message}</span>;
      break;
    default:
      updateStatus = versionLabel;
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted hover:text-fg transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="space-y-8">
        <Section title="Output">
          <Row
            label="Default output folder"
            description="Where compressed files are saved"
          >
            <div className="flex items-center gap-2">
              <button
                onClick={handlePickFolder}
                className="flex items-center gap-4 px-3 py-2 rounded-lg border border-border-soft text-sm text-fg hover:bg-white/5 transition-colors"
              >
                <span className="truncate max-w-48">
                  {settings.outputFolder ?? "Same as the input"}
                </span>
                <FolderOpen className="w-4 h-4 text-muted" />
              </button>
              {settings.outputFolder && (
                <button
                  onClick={() => update("outputFolder", undefined)}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Clear
                </button>
              )}
            </div>
          </Row>

          <div>
            <div className="text-sm font-medium text-fg">Output name pattern</div>
            <div className="text-sm text-muted mt-1">How exported files are named</div>
            <div className="relative mt-3">
              <span className="absolute left-3 top-2 text-accent font-mono text-sm select-none pointer-events-none">
                &gt;
              </span>
              <input
                type="text"
                value={settings.outputNaming}
                onChange={(e) => update("outputNaming", e.target.value)}
                spellCheck={false}
                className="w-full pl-7 pr-3 py-2 rounded-[10px] border border-border-soft bg-surface-2 text-fg font-mono text-sm outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            <p className="text-xs text-muted mt-2">
              Use <code className="text-accent">&#123;name&#125;</code>{" "}
              <code className="text-accent">&#123;date&#125;</code>{" "}
              <code className="text-accent">&#123;quality&#125;</code> and{" "}
              <code className="text-accent">&#123;ext&#125;</code> as placeholders.
            </p>
          </div>
        </Section>

        <Section title="Defaults">
          <Row label="Default quality" description="Preset selected on launch">
            <div className="inline-flex gap-1 p-1 rounded-[10px] bg-bg">
              {QUALITY_SEGMENTS.map((q) => (
                <button
                  key={q.value}
                  onClick={() => update("defaultQuality", q.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-[7px] text-sm transition-colors",
                    settings.defaultQuality === q.value
                      ? "bg-white/10 text-fg"
                      : "text-muted hover:text-fg",
                  )}
                >
                  {q.icon}
                  {q.label}
                </button>
              ))}
            </div>
          </Row>
          <Row
            label="Hardware acceleration"
            description="Use the GPU when available"
          >
            <Select
              value={settings.hardwareAccel}
              onChange={(v) => update("hardwareAccel", v as HardwareAccel)}
              options={HW_ACCEL_OPTIONS}
            />
          </Row>
        </Section>

        <Section title="Interface">
          <Row
            label="Animate greeting"
            description='Cycle the action word; off shows just "ffmpeg"'
          >
            <Toggle
              value={settings.animateGreeting}
              onChange={(v) => update("animateGreeting", v)}
            />
          </Row>
        </Section>

        <Section title="Jobs">
          <Row
            label="Max concurrent jobs"
            description="Files processed at the same time"
          >
            <div className="inline-flex items-center rounded-lg border border-border-soft ">
              <button
                onClick={() =>
                  update("concurrentJobs", Math.max(MIN_CONCURRENT, settings.concurrentJobs - 1))
                }
                disabled={settings.concurrentJobs <= MIN_CONCURRENT}
                className="px-2.5 py-1.5 text-muted hover:text-fg disabled:opacity-30 transition-colors"
              >
                <Minus className="w-4 h-6" />
              </button>
              <span className="w-8 text-center text-sm text-fg tabular-nums">
                {settings.concurrentJobs}
              </span>
              <button
                onClick={() =>
                  update("concurrentJobs", Math.min(MAX_CONCURRENT, settings.concurrentJobs + 1))
                }
                disabled={settings.concurrentJobs >= MAX_CONCURRENT}
                className="px-2.5 py-1.5 text-muted hover:text-fg disabled:opacity-30 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </Row>
          <Row
            label="Notify when done"
            description="Send a system notification on completion"
          >
            <Toggle
              value={settings.notifyOnDone}
              onChange={(v) => update("notifyOnDone", v)}
            />
          </Row>
          <Row
            label="Open folder when done"
            description="Reveal the output folder automatically"
          >
            <Toggle
              value={settings.openFolderOnDone}
              onChange={(v) => update("openFolderOnDone", v)}
            />
          </Row>
        </Section>

        <Section title="Updates">
          <Row
            label="Update channel"
            description="Stable is recommended for most users"
          >
            <Select
              value={settings.updateChannel}
              onChange={(v) => update("updateChannel", v as UpdateChannel)}
              options={UPDATE_CHANNEL_OPTIONS}
            />
          </Row>
          <Row label="Application updates" description={updateStatus}>
            <button
              onClick={handleCheckUpdates}
              disabled={updateBusy}
              className="flex items-center gap-4 px-3 py-2 text-sm rounded-lg border border-border-soft  text-fg hover:bg-white/5 disabled:opacity-50 transition-colors"
            >
              {updateState.kind === "checking" ? "Checking…" : "Check for updates"}
              <RefreshCw className="w-4 h-4 text-muted" />
            </button>
          </Row>
        </Section>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl text-base font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 transition-colors"
      >
        {saved ? "Saved!" : saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
