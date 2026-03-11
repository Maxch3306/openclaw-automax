import { getCurrentWindow } from "@tauri-apps/api/window";

export function TitleBar() {
  const appWindow = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-9 bg-[var(--color-surface)] border-b border-[var(--color-border)] select-none px-3"
    >
      <span data-tauri-drag-region className="text-sm font-semibold text-[var(--color-text-muted)]">
        MaxAuto
      </span>
      <div className="flex items-center gap-1" style={{ appRegion: "no-drag" } as React.CSSProperties}>
        <button
          onClick={() => appWindow.minimize()}
          className="w-8 h-6 flex items-center justify-center rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-xs"
        >
          &#x2014;
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="w-8 h-6 flex items-center justify-center rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-xs"
        >
          &#9744;
        </button>
        <button
          onClick={() => appWindow.close()}
          className="w-8 h-6 flex items-center justify-center rounded hover:bg-red-600/80 text-[var(--color-text-muted)] hover:text-white text-xs"
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
