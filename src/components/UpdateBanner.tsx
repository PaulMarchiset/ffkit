import { Download, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUpdater } from "@/lib/updaterContext";

/**
 * Slim, dismissible toast surfacing a pending update. Appears automatically
 * after the startup check finds one (see {@link UpdaterProvider}); install is a
 * single click. Install runs in `quiet` mode (no native installer window), so
 * this progress bar is the whole experience before the app relaunches.
 */
export function UpdateBanner() {
  const { t } = useTranslation();
  const { state, dismissed, install, dismiss } = useUpdater();

  const installing = state.kind === "installing";
  const visible =
    !dismissed && (state.kind === "available" || installing || state.kind === "error");
  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-lg border border-border-strong bg-surface-2 shadow-xl shadow-black/30">
      <div className="flex items-start gap-3 p-4">
        <span className="mt-0.5 flex-shrink-0 text-accent">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          {state.kind === "available" && (
            <>
              <p className="text-sm font-medium text-fg">{t("update.title")}</p>
              <p className="mt-0.5 text-xs text-muted">
                {t("settings.updates.available", { version: state.version })}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={install}
                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90"
                >
                  {t("update.install")}
                </button>
                <button
                  onClick={dismiss}
                  className="rounded-md px-3 py-1.5 text-xs text-muted transition-colors hover:bg-white/5 hover:text-fg"
                >
                  {t("update.later")}
                </button>
              </div>
            </>
          )}

          {installing && (
            <>
              <p className="text-sm font-medium text-fg">
                {t("settings.updates.installing", {
                  percent: Math.round(state.progress * 100),
                })}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-150"
                  style={{ width: `${Math.round(state.progress * 100)}%` }}
                />
              </div>
            </>
          )}

          {state.kind === "error" && (
            <p className="text-sm text-red-500">{state.message}</p>
          )}
        </div>

        {!installing && (
          <button
            onClick={dismiss}
            aria-label={t("update.later")}
            className="flex-shrink-0 rounded text-muted transition-colors hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
