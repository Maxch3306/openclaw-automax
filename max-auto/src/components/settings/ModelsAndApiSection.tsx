import { useEffect } from "react";
import { useSettingsStore } from "../../stores/settings-store";
import { useAppStore } from "../../stores/app-store";
import { gateway } from "../../api/gateway-client";
import { AddModelDialog } from "./AddModelDialog";

export function ModelsAndApiSection() {
  const customModels = useSettingsStore((s) => s.customModels);
  const selectedModelId = useSettingsStore((s) => s.selectedModelId);
  const showAddDialog = useSettingsStore((s) => s.showAddModelDialog);
  const setShowAddDialog = useSettingsStore((s) => s.setShowAddModelDialog);
  const loadConfig = useSettingsStore((s) => s.loadConfig);
  const setSelectedModelId = useSettingsStore((s) => s.setSelectedModelId);
  const gatewayConnected = useAppStore((s) => s.gatewayConnected);
  const gatewayPort = useAppStore((s) => s.gatewayPort);

  useEffect(() => {
    loadConfig();
  }, []);

  const handleReconnect = () => {
    gateway.disconnect();
    setTimeout(() => {
      gateway.connect(gatewayPort);
    }, 500);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-[var(--color-text)]">Models & API</h1>
        <button
          onClick={handleReconnect}
          className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          Reconnect
        </button>
      </div>

      {/* Built-in models */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">Built-in Models</h2>
        <div className="space-y-2">
          <p className="text-sm text-[var(--color-text-muted)] py-2">
            Built-in models require an API Key to use. Please add and configure them via "Add Custom Model".
          </p>
        </div>
      </section>

      {/* Custom models */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-[var(--color-text-muted)]">Custom Models</h2>
          <button
            onClick={() => setShowAddDialog(true)}
            className="text-sm px-3 py-1.5 rounded-lg bg-[var(--color-warning)] text-white hover:opacity-90 transition-opacity"
          >
            Add Custom Model
          </button>
        </div>
        <div className="space-y-2">
          {customModels.map((model) => (
            <div
              key={model.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <div>
                <span className="text-sm text-[var(--color-text)]">{model.displayName || model.id}</span>
                <span className="ml-2 text-xs text-[var(--color-text-muted)]">{model.provider}</span>
              </div>
              <div className="flex items-center gap-3">
                {selectedModelId === model.id && (
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-success)]/20 text-[var(--color-success)]">
                    Selected
                  </span>
                )}
                <button
                  onClick={() => setSelectedModelId(model.id)}
                  className="text-xs text-[var(--color-warning)] hover:underline"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
          {customModels.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)] py-2">No custom models yet</p>
          )}
        </div>
      </section>

      {/* Gateway URL */}
      <section>
        <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">Gateway URL</h2>
        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                gatewayConnected
                  ? "bg-[var(--color-success)]/20 text-[var(--color-success)]"
                  : "bg-[var(--color-error)]/20 text-[var(--color-error)]"
              }`}
            >
              {gatewayConnected ? "Connected" : "Disconnected"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReconnect}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                Reconnect
              </button>
              <button
                onClick={handleReconnect}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-warning)] text-white hover:opacity-90 transition-opacity"
              >
                Reset Connection
              </button>
            </div>
          </div>
          <div className="px-3 py-2 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] font-mono">
            ws://127.0.0.1:{gatewayPort}
          </div>
        </div>
      </section>

      {showAddDialog && <AddModelDialog />}
    </div>
  );
}
