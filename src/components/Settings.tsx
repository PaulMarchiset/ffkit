import { useEffect, useRef, useState } from "react";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { pickOutputFolder } from "@/lib/dialogs";
import { useSettings } from "@/lib/settingsContext";
import type { Settings, Quality, HardwareAccel, UpdateChannel } from "@/lib/types";
import { Section } from "./ui/Section";
import { Row } from "./ui/Row";
import { Select } from "./ui/Select";
import { Toggle } from "./ui/Toggle";

interface Props {
  onBack: () => void;
}

const QUALITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "lossless", label: "Lossless" },
];

const HW_ACCEL_OPTIONS = [
  { value: "auto", label: "Auto (recommended)" },
  { value: "software", label: "Force software (libx264)" },
];

const CONCURRENT_OPTIONS = [1, 2, 3, 4].map((n) => ({
  value: String(n),
  label: String(n),
}));

const UPDATE_CHANNEL_OPTIONS = [
  { value: "stable", label: "Stable" },
  { value: "beta", label: "Beta" },
];

const SAVED_BANNER_MS = 2000;

export function SettingsPanel({ onBack }: Props) {
  const { settings: persisted, saveSettings } = useSettings();
  // Local editable draft; seeded from the canonical settings and only pushed
  // back through the context on save.
  const [settings, setLocal] = useState<Settings | null>(persisted);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(persisted);
  }, [persisted]);

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

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted hover:text-fg transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="space-y-6">
        <Section title="Output">
          <Row label="Default output folder">
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted truncate max-w-48">
                {settings.outputFolder ?? "Same as input"}
              </span>
              <button
                onClick={handlePickFolder}
                className="p-1.5 rounded-lg border border-border-soft text-muted hover:bg-white/5 transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
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
          <Row label="Output name pattern">
            <input
              type="text"
              value={settings.outputNaming}
              onChange={(e) => update("outputNaming", e.target.value)}
              className="w-48 px-2 py-1 text-sm rounded-md border border-border-soft bg-bg text-fg outline-none focus:border-accent/50"
            />
          </Row>
        </Section>

        <Section title="Defaults">
          <Row label="Default quality">
            <Select
              value={settings.defaultQuality}
              onChange={(v) => update("defaultQuality", v as Quality)}
              options={QUALITY_OPTIONS}
            />
          </Row>
          <Row label="Hardware acceleration">
            <Select
              value={settings.hardwareAccel}
              onChange={(v) => update("hardwareAccel", v as HardwareAccel)}
              options={HW_ACCEL_OPTIONS}
            />
          </Row>
        </Section>

        <Section title="Jobs">
          <Row label="Max concurrent jobs">
            <Select
              value={String(settings.concurrentJobs)}
              onChange={(v) => update("concurrentJobs", Number(v))}
              options={CONCURRENT_OPTIONS}
            />
          </Row>
          <Row label="Notify when done">
            <Toggle
              value={settings.notifyOnDone}
              onChange={(v) => update("notifyOnDone", v)}
            />
          </Row>
          <Row label="Open folder when done">
            <Toggle
              value={settings.openFolderOnDone}
              onChange={(v) => update("openFolderOnDone", v)}
            />
          </Row>
        </Section>

        <Section title="Updates">
          <Row label="Update channel">
            <Select
              value={settings.updateChannel}
              onChange={(v) => update("updateChannel", v as UpdateChannel)}
              options={UPDATE_CHANNEL_OPTIONS}
            />
          </Row>
        </Section>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="self-start px-6 py-2.5 rounded-xl font-semibold text-white bg-accent hover:bg-accent/85 disabled:opacity-50 transition-colors"
      >
        {saved ? "Saved!" : saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
