import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Update } from "@tauri-apps/plugin-updater";
import { updaterService } from "@/lib/services/updaterService";

export type UpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "uptodate" }
  | { kind: "available"; version: string }
  | { kind: "installing"; progress: number }
  | { kind: "error"; message: string };

interface UpdaterContextValue {
  state: UpdateState;
  /** True once the user dismisses the "available" banner (until next check). */
  dismissed: boolean;
  /**
   * Query the endpoint. On success sets `available` (with the pending update
   * stashed for {@link install}) or `uptodate`. When `silent`, swallows errors
   * and stays idle — used for the automatic startup check so a failed probe
   * (e.g. offline, or running unbundled in dev) never surfaces UI.
   */
  check: (silent?: boolean) => Promise<void>;
  /** Download + install the pending update in place, then relaunch. */
  install: () => Promise<void>;
  /** Hide the banner without installing; reappears on the next found update. */
  dismiss: () => void;
}

const UpdaterContext = createContext<UpdaterContextValue | null>(null);

/**
 * Single source of truth for the in-place auto-update flow. Runs one check on
 * mount; when an update is found the state flips to `available` and the app
 * surfaces a banner (see {@link UpdateBanner}). Install is one click, from
 * either the banner or the Settings panel, so both stay in sync. The plugin
 * calls themselves live in {@link updaterService}.
 */
export function UpdaterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UpdateState>({ kind: "idle" });
  const [dismissed, setDismissed] = useState(false);
  // The pending Update handle from the last successful check, kept out of React
  // state because it's a non-serializable plugin object only `install` needs.
  const pendingRef = useRef<Update | null>(null);

  const check = useCallback(async (silent = false) => {
    setState({ kind: "checking" });
    try {
      const update = await updaterService.check();
      if (!update) {
        pendingRef.current = null;
        setState({ kind: "uptodate" });
        return;
      }
      pendingRef.current = update;
      setDismissed(false);
      setState({ kind: "available", version: update.version });
    } catch (err) {
      pendingRef.current = null;
      if (silent) setState({ kind: "idle" });
      else setState({ kind: "error", message: String(err) });
    }
  }, []);

  const install = useCallback(async () => {
    const update = pendingRef.current;
    if (!update) return;
    setState({ kind: "installing", progress: 0 });
    try {
      await updaterService.install(update, (fraction) =>
        setState({ kind: "installing", progress: fraction }),
      );
      // App relaunches on success; code past here is effectively unreachable.
    } catch (err) {
      setState({ kind: "error", message: String(err) });
    }
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  // One automatic, silent check on launch — this is what makes updates "auto".
  useEffect(() => {
    check(true);
  }, [check]);

  return (
    <UpdaterContext.Provider value={{ state, dismissed, check, install, dismiss }}>
      {children}
    </UpdaterContext.Provider>
  );
}

export function useUpdater(): UpdaterContextValue {
  const ctx = useContext(UpdaterContext);
  if (!ctx) {
    throw new Error("useUpdater must be used within an UpdaterProvider");
  }
  return ctx;
}
