import { useState } from "react";
import { useSettingsStore } from "../../stores/settings-store";

const PROVIDERS = [
  { id: "bailian", label: "Qwen Coding (Bailian)", defaultUrl: "https://coding.dashscope.aliyuncs.com/v1" },
  { id: "zhipu", label: "ZhipuAI", defaultUrl: "https://open.bigmodel.cn/api/paas/v4" },
  { id: "kimi for coding", label: "Kimi (Moonshot)", defaultUrl: "https://api.kimi.com/coding" },
  { id: "openai", label: "OpenAI", defaultUrl: "https://api.openai.com/v1" },
  { id: "anthropic", label: "Anthropic", defaultUrl: "https://api.anthropic.com/v1" },
  { id: "deepseek", label: "DeepSeek", defaultUrl: "https://api.deepseek.com/v1" },
  { id: "ollama", label: "Ollama (Local)", defaultUrl: "http://localhost:11434/v1" },
  { id: "custom", label: "Custom", defaultUrl: "" },
];

const API_PROTOCOLS = ["OpenAI", "Anthropic"];

export function AddModelDialog() {
  const setShowAddDialog = useSettingsStore((s) => s.setShowAddModelDialog);
  const addCustomModel = useSettingsStore((s) => s.addCustomModel);

  const [provider, setProvider] = useState("zhipu");
  const [modelId, setModelId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiProtocol, setApiProtocol] = useState("OpenAI");
  const [baseUrl, setBaseUrl] = useState(PROVIDERS[0].defaultUrl);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const p = PROVIDERS.find((p) => p.id === newProvider);
    if (p) setBaseUrl(p.defaultUrl);
  };

  const handleSubmit = async () => {
    if (!modelId.trim()) {
      setError("Model ID is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addCustomModel({
        id: modelId.trim(),
        displayName: displayName.trim() || modelId.trim(),
        provider: PROVIDERS.find((p) => p.id === provider)?.label ?? provider,
        apiKey: apiKey.trim() || undefined,
        apiProtocol,
        baseUrl: baseUrl.trim(),
      });
      setShowAddDialog(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[480px] max-h-[90vh] overflow-y-auto bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text)]">Add Model</h2>
          <button
            onClick={() => setShowAddDialog(false)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg"
          >
            ×
          </button>
        </div>

        {/* Warning */}
        <div className="mx-6 mt-4 px-3 py-2 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30">
          <p className="text-xs text-[var(--color-warning)]">
            ! Adding an external model means you understand and accept the associated risks.
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {/* Provider */}
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">* Provider</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Model ID */}
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">* Model ID</label>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="Enter model ID"
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter display name"
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API Key (optional)"
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 pr-10 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-accent)]"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs"
              >
                {showKey ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* API Protocol */}
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">API Protocol</label>
            <select
              value={apiProtocol}
              onChange={(e) => setApiProtocol(e.target.value)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              {API_PROTOCOLS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--color-error)]">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
          <button
            onClick={() => setShowAddDialog(false)}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--color-warning)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
