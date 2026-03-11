import { useState } from "react";
import { useSettingsStore } from "../../stores/settings-store";
import { openUrl } from "../../api/tauri-commands";

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

type AuthMethod = "api_key" | "oauth" | "setup_token";

const PROVIDER_AUTH_METHODS: Record<string, { methods: { id: AuthMethod; label: string }[] }> = {
  openai: {
    methods: [
      { id: "api_key", label: "API Key" },
      { id: "oauth", label: "OAuth Login" },
    ],
  },
  anthropic: {
    methods: [
      { id: "api_key", label: "API Key" },
      { id: "setup_token", label: "Setup Token" },
    ],
  },
};

const API_PROTOCOLS = ["OpenAI", "Anthropic"];

export function AddModelDialog() {
  const setShowAddDialog = useSettingsStore((s) => s.setShowAddModelDialog);
  const addCustomModel = useSettingsStore((s) => s.addCustomModel);

  const [provider, setProvider] = useState("zhipu");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("api_key");
  const [modelId, setModelId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [apiProtocol, setApiProtocol] = useState("OpenAI");
  const [baseUrl, setBaseUrl] = useState(PROVIDERS[0].defaultUrl);
  const [showKey, setShowKey] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [oauthStatus, setOauthStatus] = useState<"idle" | "pending" | "success" | "error">("idle");

  const providerAuth = PROVIDER_AUTH_METHODS[provider];
  const hasAuthMethods = !!providerAuth;

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    setAuthMethod("api_key");
    setOauthStatus("idle");
    setError("");
    const p = PROVIDERS.find((p) => p.id === newProvider);
    if (p) setBaseUrl(p.defaultUrl);
    // Auto-set protocol based on provider
    if (newProvider === "anthropic") {
      setApiProtocol("Anthropic");
    } else {
      setApiProtocol("OpenAI");
    }
  };

  const handleOAuthLogin = async () => {
    if (provider === "openai") {
      setOauthStatus("pending");
      setError("");
      try {
        // Open OpenAI platform login page — user creates API key there
        await openUrl("https://platform.openai.com/api-keys");
        setOauthStatus("success");
      } catch (err) {
        setOauthStatus("error");
        setError(`Failed to open browser: ${err}`);
      }
    }
  };

  const handleOpenAnthropicConsole = async () => {
    try {
      await openUrl("https://console.anthropic.com/settings/keys");
    } catch (err) {
      setError(`Failed to open browser: ${err}`);
    }
  };

  const handleSubmit = async () => {
    if (!modelId.trim()) {
      setError("Model ID is required");
      return;
    }

    // Determine the credential to use
    let credential = "";
    if (authMethod === "api_key") {
      credential = apiKey.trim();
    } else if (authMethod === "setup_token") {
      credential = setupToken.trim();
    }

    setSaving(true);
    setError("");
    try {
      await addCustomModel({
        id: modelId.trim(),
        displayName: displayName.trim() || modelId.trim(),
        provider: PROVIDERS.find((p) => p.id === provider)?.label ?? provider,
        apiKey: credential || undefined,
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

  const inputClass =
    "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-accent)]";

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
              className={inputClass}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Auth Method (only for providers that support multiple methods) */}
          {hasAuthMethods && (
            <div>
              <label className="block text-sm text-[var(--color-text-muted)] mb-1">Auth Method</label>
              <div className="flex gap-2">
                {providerAuth.methods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setAuthMethod(m.id);
                      setError("");
                      setOauthStatus("idle");
                    }}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      authMethod === m.id
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Model ID */}
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">* Model ID</label>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="Enter model ID"
              className={inputClass}
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
              className={inputClass}
            />
          </div>

          {/* Auth Credential Section — varies by method */}
          {authMethod === "api_key" && (
            <div>
              <label className="block text-sm text-[var(--color-text-muted)] mb-1">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API Key (optional)"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {authMethod === "oauth" && provider === "openai" && (
            <div className="space-y-3">
              <div className="px-3 py-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)] mb-3">
                  Click the button below to open OpenAI's API key page in your browser.
                  Create or copy your API key, then paste it here.
                </p>
                <button
                  type="button"
                  onClick={handleOAuthLogin}
                  disabled={oauthStatus === "pending"}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#10a37f] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {oauthStatus === "pending"
                    ? "Opening browser..."
                    : oauthStatus === "success"
                      ? "Browser opened — paste your key below"
                      : "Open OpenAI Platform"}
                </button>
              </div>
              {oauthStatus === "success" && (
                <div>
                  <label className="block text-sm text-[var(--color-text-muted)] mb-1">
                    Paste API Key from OpenAI
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {authMethod === "setup_token" && provider === "anthropic" && (
            <div className="space-y-3">
              <div className="px-3 py-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)] mb-3">
                  Get a setup token from the Anthropic Console. This is a one-time token
                  used to authenticate your account.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAnthropicConsole}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#d97706] text-white hover:opacity-90 transition-opacity"
                >
                  Open Anthropic Console
                </button>
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">
                  Setup Token
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={setupToken}
                    onChange={(e) => setSetupToken(e.target.value)}
                    placeholder="Paste setup token from Anthropic Console"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs"
                  >
                    {showToken ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* API Protocol */}
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">API Protocol</label>
            <select
              value={apiProtocol}
              onChange={(e) => setApiProtocol(e.target.value)}
              className={inputClass}
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
              className={inputClass}
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
