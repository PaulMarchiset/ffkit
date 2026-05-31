import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

/**
 * Custom-drawn Windows-style caption controls (minimize / maximize / close).
 * Rendered at the far right of the unified title bar. These sit OUTSIDE any
 * data-tauri-drag-region so the drag handler doesn't swallow their clicks.
 */
export function WindowControls() {
  return (
    <div className="flex items-stretch self-stretch">
      <button
        type="button"
        aria-label="Minimize"
        onClick={() => appWindow.minimize()}
        className="w-[46px] flex items-center justify-center text-fg/80 hover:bg-white/[0.08] transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>

      <button
        type="button"
        aria-label="Maximize"
        onClick={() => appWindow.toggleMaximize()}
        className="w-[46px] flex items-center justify-center text-fg/80 hover:bg-white/[0.08] transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>

      <button
        type="button"
        aria-label="Close"
        onClick={() => appWindow.close()}
        className="w-[46px] flex items-center justify-center text-fg/80 hover:bg-[#c42b1c] hover:text-white transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1" />
          <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
    </div>
  );
}
