import { useEffect, useState } from "react";
import { ArrowLeft, FolderOpen, Minus, Monitor, Moon, Plus, RefreshCw, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { pickOutputFolder } from "@/lib/dialogs";
import { systemService } from "@/lib/services/systemService";
import { useSettings } from "@/lib/settingsContext";
import { useUpdater } from "@/lib/updaterContext";
import type {
  Settings,
  Quality,
  HardwareAccel,
  UpdateChannel,
  Theme,
  LanguagePref,
} from "@/lib/types";
import { cn } from "@/lib/cn";
import { Section } from "./ui/Section";
import { Row } from "./ui/Row";
import { Select } from "./ui/Select";
import { Toggle } from "./ui/Toggle";
import { FeatherIcon, LuggageIcon, DiamondIcon } from "./icons/QualityIcons";

interface Props {
  onBack: () => void;
}

const QUALITY_SEGMENTS: { value: Quality; icon: React.ReactNode }[] = [
  { value: "low", icon: <FeatherIcon /> },
  { value: "medium", icon: <LuggageIcon /> },
  { value: "lossless", icon: <DiamondIcon /> },
];

const THEME_SEGMENTS: { value: Theme; icon: React.ReactNode }[] = [
  { value: "system", icon: <Monitor className="w-4 h-4" /> },
  { value: "light", icon: <Sun className="w-4 h-4" /> },
  { value: "dark", icon: <Moon className="w-4 h-4" /> },
];

const MIN_CONCURRENT = 1;
const MAX_CONCURRENT = 4;

// Debounce window for auto-save so rapid edits (e.g. typing the name pattern)
// coalesce into a single persist instead of writing on every keystroke.
const AUTOSAVE_MS = 300;

export function SettingsPanel({ onBack }: Props) {
  const { t } = useTranslation();
  const { settings: persisted, saveSettings } = useSettings();
  // Local editable draft for instant UI feedback; auto-persisted (debounced)
  // whenever it diverges from the canonical settings — there is no Save button.
  const [settings, setLocal] = useState<Settings | null>(persisted);
  const [appVersion, setAppVersion] = useState("");
  // Update state is shared with the startup check / banner so a check or install
  // started in either place is reflected in both.
  const { state: updateState, check, install } = useUpdater();

  useEffect(() => {
    setLocal(persisted);
  }, [persisted]);

  useEffect(() => {
    systemService
      .appVersion()
      .then(setAppVersion)
      .catch(() => {});
  }, []);

  // Auto-save: when the draft diverges from the canonical settings, persist it
  // after a short debounce. The `=== persisted` guard skips the initial seed
  // and the re-seed that follows each save, so there's no write loop.
  useEffect(() => {
    if (!settings || settings === persisted) return;
    const id = setTimeout(() => saveSettings(settings), AUTOSAVE_MS);
    return () => clearTimeout(id);
  }, [settings, persisted, saveSettings]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setLocal((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  // When an update is already pending, the button installs it; otherwise it
  // runs a fresh (non-silent, so errors surface here) check.
  function handleUpdateButton() {
    if (updateState.kind === "available") install();
    else check();
  }

  async function handlePickFolder() {
    const folder = await pickOutputFolder();
    if (folder) update("outputFolder", folder);
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-40 text-muted text-sm">
        {t("common.loading")}
      </div>
    );
  }

  const hwAccelOptions = [
    { value: "auto", label: t("settings.hardwareAccel.auto") },
    { value: "software", label: t("settings.hardwareAccel.software") },
  ];
  const updateChannelOptions = [
    { value: "stable", label: t("settings.updateChannel.stable") },
    { value: "beta", label: t("settings.updateChannel.beta") },
  ];
  // Language names stay in their own language (convention); "System" is localized.
  const languageOptions = [
    { value: "system", label: t("settings.language.system") },
    { value: "en", label: "English" },
    { value: "fr", label: "Français" },
  ];

  const updateBusy =
    updateState.kind === "checking" || updateState.kind === "installing";

  const versionLabel = appVersion ? `FFkit ${appVersion}` : "FFkit";
  let updateStatus: React.ReactNode;
  switch (updateState.kind) {
    case "checking":
      updateStatus = `${versionLabel} — ${t("settings.updates.checking")}`;
      break;
    case "uptodate":
      updateStatus = `${versionLabel} — ${t("settings.updates.uptodate")}`;
      break;
    case "available":
      updateStatus = `${versionLabel} — ${t("settings.updates.available", { version: updateState.version })}`;
      break;
    case "installing":
      updateStatus = `${versionLabel} — ${t("settings.updates.installing", { percent: Math.round(updateState.progress * 100) })}`;
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
        {t("common.back")}
      </button>

      <div className="space-y-8">
        <Section title={t("settings.sections.output")}>
          <Row
            label={t("settings.outputFolder.label")}
            description={t("settings.outputFolder.description")}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={handlePickFolder}
                className="flex items-center gap-4 px-3 py-2 rounded-lg border border-border-soft text-sm text-fg hover:bg-elevate-2 transition-colors"
              >
                <span className="truncate max-w-48">
                  {settings.outputFolder ?? t("settings.outputFolder.sameAsInput")}
                </span>
                <FolderOpen className="w-4 h-4 text-muted" />
              </button>
              {settings.outputFolder && (
                <button
                  onClick={() => update("outputFolder", undefined)}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  {t("settings.outputFolder.clear")}
                </button>
              )}
            </div>
          </Row>

          <div>
            <div className="text-sm font-medium text-fg">{t("settings.naming.title")}</div>
            <div className="text-sm text-muted mt-1">{t("settings.naming.description")}</div>
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
              {t("settings.naming.helpBefore")}{" "}
              <code className="text-accent">&#123;name&#125;</code>{" "}
              <code className="text-accent">&#123;date&#125;</code>{" "}
              <code className="text-accent">&#123;quality&#125;</code> {t("command.helpMid")}{" "}
              <code className="text-accent">&#123;ext&#125;</code> {t("settings.naming.helpAfter")}
            </p>
          </div>
        </Section>

        <Section title={t("settings.sections.defaults")}>
          <Row
            label={t("settings.defaultQuality.label")}
            description={t("settings.defaultQuality.description")}
          >
            <div className="inline-flex gap-1 p-1 rounded-[10px] bg-bg">
              {QUALITY_SEGMENTS.map((q) => (
                <button
                  key={q.value}
                  onClick={() => update("defaultQuality", q.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-[7px] text-sm transition-colors",
                    settings.defaultQuality === q.value
                      ? "bg-elevate-4 text-fg"
                      : "text-muted hover:text-fg",
                  )}
                >
                  {q.icon}
                  {t(`quality.${q.value}.label`)}
                </button>
              ))}
            </div>
          </Row>
          <Row
            label={t("settings.hardwareAccel.label")}
            description={t("settings.hardwareAccel.description")}
          >
            <Select
              value={settings.hardwareAccel}
              onChange={(v) => update("hardwareAccel", v as HardwareAccel)}
              options={hwAccelOptions}
            />
          </Row>
        </Section>

        <Section title={t("settings.sections.interface")}>
          <Row
            label={t("settings.theme.label")}
            description={t("settings.theme.description")}
          >
            <div className="inline-flex gap-1 p-1 rounded-[10px] bg-bg">
              {THEME_SEGMENTS.map((seg) => (
                <button
                  key={seg.value}
                  onClick={() => update("theme", seg.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-[7px] text-sm transition-colors",
                    settings.theme === seg.value
                      ? "bg-elevate-4 text-fg"
                      : "text-muted hover:text-fg",
                  )}
                >
                  {seg.icon}
                  {t(`settings.theme.${seg.value}`)}
                </button>
              ))}
            </div>
          </Row>
          <Row
            label={t("settings.language.label")}
            description={t("settings.language.description")}
          >
            <Select
              value={settings.language}
              onChange={(v) => update("language", v as LanguagePref)}
              options={languageOptions}
            />
          </Row>
          <Row
            label={t("settings.animateGreeting.label")}
            description={t("settings.animateGreeting.description")}
          >
            <Toggle
              value={settings.animateGreeting}
              onChange={(v) => update("animateGreeting", v)}
            />
          </Row>
        </Section>

        <Section title={t("settings.sections.jobs")}>
          <Row
            label={t("settings.concurrentJobs.label")}
            description={t("settings.concurrentJobs.description")}
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
            label={t("settings.notify.label")}
            description={t("settings.notify.description")}
          >
            <Toggle
              value={settings.notifyOnDone}
              onChange={(v) => update("notifyOnDone", v)}
            />
          </Row>
          <Row
            label={t("settings.openFolder.label")}
            description={t("settings.openFolder.description")}
          >
            <Toggle
              value={settings.openFolderOnDone}
              onChange={(v) => update("openFolderOnDone", v)}
            />
          </Row>
        </Section>

        <Section title={t("settings.sections.updates")}>
          <Row
            label={t("settings.updateChannel.label")}
            description={t("settings.updateChannel.description")}
          >
            <Select
              value={settings.updateChannel}
              onChange={(v) => update("updateChannel", v as UpdateChannel)}
              options={updateChannelOptions}
            />
          </Row>
          <Row label={t("settings.updates.label")} description={updateStatus}>
            <button
              onClick={handleUpdateButton}
              disabled={updateBusy}
              className="flex items-center gap-4 px-3 py-2 text-sm rounded-lg border border-border-soft  text-fg hover:bg-elevate-2 disabled:opacity-50 transition-colors"
            >
              {updateState.kind === "checking"
                ? t("settings.updates.checkingButton")
                : updateState.kind === "available"
                  ? t("update.install")
                  : t("settings.updates.checkButton")}
              <RefreshCw className="w-4 h-4 text-muted" />
            </button>
          </Row>
        </Section>
      </div>
    </div>
  );
}
