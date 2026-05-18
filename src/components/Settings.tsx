import { useState, useEffect } from "react";
import { ArrowLeft, FolderOpen } from "lucide-react";
import {
  getSettings,
  setSettings,
  pickOutputFolder,
  type Settings,
  type Quality,
  type HardwareAccel,
  type UpdateChannel,
} from "@/lib/tauri";

interface Props {
  onBack: () => void;
}

export function SettingsPanel({ onBack }: Props) {
  const [settings, setLocal] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setLocal);
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      await setSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handlePickFolder() {
    const folder = await pickOutputFolder();
    if (folder && settings) {
      setLocal({ ...settings, outputFolder: folder });
    }
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
        {/* Output folder */}
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
                  onClick={() => setLocal({ ...settings, outputFolder: undefined })}
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
              onChange={(e) => setLocal({ ...settings, outputNaming: e.target.value })}
              className="w-48 px-2 py-1 text-sm rounded-md border border-border-soft bg-bg text-fg outline-none focus:border-accent/50"
            />
          </Row>
        </Section>

        {/* Quality */}
        <Section title="Defaults">
          <Row label="Default quality">
            <Select
              value={settings.defaultQuality}
              onChange={(v) => setLocal({ ...settings, defaultQuality: v as Quality })}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "lossless", label: "Lossless" },
              ]}
            />
          </Row>
          <Row label="Hardware acceleration">
            <Select
              value={settings.hardwareAccel}
              onChange={(v) => setLocal({ ...settings, hardwareAccel: v as HardwareAccel })}
              options={[
                { value: "auto", label: "Auto (recommended)" },
                { value: "software", label: "Force software (libx264)" },
              ]}
            />
          </Row>
        </Section>

        {/* Jobs */}
        <Section title="Jobs">
          <Row label="Max concurrent jobs">
            <Select
              value={String(settings.concurrentJobs)}
              onChange={(v) => setLocal({ ...settings, concurrentJobs: Number(v) })}
              options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
            />
          </Row>
          <Row label="Notify when done">
            <Toggle
              value={settings.notifyOnDone}
              onChange={(v) => setLocal({ ...settings, notifyOnDone: v })}
            />
          </Row>
          <Row label="Open folder when done">
            <Toggle
              value={settings.openFolderOnDone}
              onChange={(v) => setLocal({ ...settings, openFolderOnDone: v })}
            />
          </Row>
        </Section>

        {/* Update */}
        <Section title="Updates">
          <Row label="Update channel">
            <Select
              value={settings.updateChannel}
              onChange={(v) => setLocal({ ...settings, updateChannel: v as UpdateChannel })}
              options={[
                { value: "stable", label: "Stable" },
                { value: "beta", label: "Beta" },
              ]}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-subtle">{label}</span>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 text-sm rounded-md border border-border-soft bg-bg text-fg outline-none focus:border-accent/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
        value ? "bg-accent" : "bg-white/20"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          value ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
