import { create } from "zustand";
import { gateway } from "../api/gateway-client";
import { readConfig, writeConfig, stopGateway, startGateway } from "../api/tauri-commands";

export type SettingsSection =
  | "general"
  | "usage"
  | "credits"
  | "models"
  | "mcp"
  | "skills"
  | "im-channels"
  | "workspace"
  | "privacy"
  | "feedback"
  | "about";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  reasoning?: boolean;
}

export interface CustomModel {
  id: string;
  displayName: string;
  provider: string;
  apiKey?: string;
  apiProtocol: string;
  baseUrl: string;
}

/**
 * Static defaults for known OpenClaw implicit providers.
 * Only baseUrl and api are needed here — model definitions come from models.list at runtime.
 * Source: OpenClaw src/agents/models-config.providers.static.ts
 */
export const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; api: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", api: "openai-completions" },
  anthropic: { baseUrl: "https://api.anthropic.com", api: "anthropic-messages" },
  "amazon-bedrock": {
    baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
    api: "bedrock-converse-stream",
  },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", api: "openai-completions" },
  google: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    api: "google-generative-ai",
  },
  "github-copilot": { baseUrl: "https://api.githubcopilot.com", api: "github-copilot" },
  ollama: { baseUrl: "http://localhost:11434/v1", api: "ollama" },
  "kimi-coding": { baseUrl: "https://api.kimi.com/coding/", api: "anthropic-messages" },
  moonshot: { baseUrl: "https://api.moonshot.ai/v1", api: "openai-completions" },
  minimax: { baseUrl: "https://api.minimax.io/anthropic", api: "anthropic-messages" },
  "minimax-cn": { baseUrl: "https://api.minimaxi.com/anthropic", api: "anthropic-messages" },
  together: { baseUrl: "https://api.together.xyz/v1", api: "openai-completions" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", api: "openai-completions" },
  nvidia: { baseUrl: "https://integrate.api.nvidia.com/v1", api: "openai-completions" },
  modelstudio: {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    api: "openai-completions",
  },
  huggingface: { baseUrl: "https://api-inference.huggingface.co/v1", api: "openai-completions" },
  qianfan: { baseUrl: "https://qianfan.baidubce.com/v2", api: "openai-completions" },
  venice: { baseUrl: "https://api.venice.ai/api/v1", api: "openai-completions" },
  vllm: { baseUrl: "http://localhost:8000/v1", api: "openai-completions" },
  volcengine: { baseUrl: "https://ark.cn-beijing.volces.com/api/v3", api: "openai-completions" },
  byteplus: {
    baseUrl: "https://ark.ap-southeast.bytepluses.com/api/v3",
    api: "openai-completions",
  },
};

/** Map UI protocol label to OpenClaw `api` value */
function mapProtocolToApi(protocol: string): string {
  switch (protocol) {
    case "Anthropic":
      return "anthropic-messages";
    case "OpenAI":
    default:
      return "openai-completions";
  }
}

/** Derive a config-safe provider key from label (e.g. "ZhipuAI" → "zhipuai") */
function providerKey(provider: string): string {
  return provider
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Build the OpenClaw `models.providers` patch object from a list of CustomModels.
 * Each unique provider becomes a key; models with the same provider are grouped.
 */
const REDACTED_SENTINEL = "__OPENCLAW_REDACTED__";

function buildProvidersPatch(models: CustomModel[]): Record<string, unknown> {
  const grouped: Record<string, CustomModel[]> = {};
  for (const m of models) {
    const key = providerKey(m.provider);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(m);
  }

  const providers: Record<string, unknown> = {};
  for (const [key, group] of Object.entries(grouped)) {
    const first = group[0];
    const hasRealKey = first.apiKey && first.apiKey !== REDACTED_SENTINEL;
    providers[key] = {
      baseUrl: first.baseUrl,
      ...(hasRealKey ? { apiKey: first.apiKey } : {}),
      api: mapProtocolToApi(first.apiProtocol),
      models: group.map((m) => ({
        id: m.id,
        name: m.displayName,
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 8192,
      })),
    };
  }
  return providers;
}

interface ProviderConfig {
  baseUrl: string;
  apiKey?: string;
  api?: string;
  models?: Array<{
    id: string;
    name: string;
    contextWindow?: number;
    reasoning?: boolean;
  }>;
}

/** Parse only custom (non-built-in) providers from config into CustomModel[] */
function parseCustomProvidersOnly(
  providers: Record<string, ProviderConfig> | undefined,
): CustomModel[] {
  if (!providers) {
    return [];
  }
  const result: CustomModel[] = [];
  for (const [key, provCfg] of Object.entries(providers)) {
    // Skip built-in providers — they're managed by setProviderAuth/removeProvider
    if (key in PROVIDER_DEFAULTS) {
      continue;
    }
    const protocol = provCfg.api === "anthropic-messages" ? "Anthropic" : "OpenAI";
    for (const m of provCfg.models ?? []) {
      result.push({
        id: m.id,
        displayName: m.name ?? m.id,
        provider: provCfg.baseUrl,
        apiKey: typeof provCfg.apiKey === "string" ? provCfg.apiKey : undefined,
        apiProtocol: protocol,
        baseUrl: provCfg.baseUrl,
      });
    }
  }
  return result;
}

/** Split existing providers into built-in and custom entries */
function splitProviders(providers: Record<string, unknown> | undefined): {
  builtIn: Record<string, unknown>;
  custom: Record<string, unknown>;
} {
  const builtIn: Record<string, unknown> = {};
  const custom: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(providers ?? {})) {
    if (key in PROVIDER_DEFAULTS) {
      builtIn[key] = val;
    } else {
      custom[key] = val;
    }
  }
  return { builtIn, custom };
}
async function readConfigFile(): Promise<Record<string, unknown>> {
  const { raw } = await readConfig();
  return JSON.parse(raw);
}

/** Write openclaw.json directly via Tauri, then restart gateway */
async function writeConfigAndRestart(config: Record<string, unknown>): Promise<void> {
  const raw = JSON.stringify(config, null, 2);
  await writeConfig(raw);

  // Restart gateway so it picks up the new config
  try {
    gateway.disconnect();
    await stopGateway();
    await new Promise((r) => setTimeout(r, 1500));
    await startGateway();
    await new Promise((r) => setTimeout(r, 3000));
    gateway.reconnect();
    // Wait for WS to establish, then reload
    await new Promise((r) => setTimeout(r, 2000));
  } catch (err) {
    console.warn("[settings] restartGateway failed:", err);
  }
}

interface SettingsState {
  activeSection: SettingsSection;
  models: ModelInfo[];
  customModels: CustomModel[];
  configuredProviders: Set<string>;
  defaultModelId: string | null;
  configBaseHash: string | null;
  showAddModelDialog: boolean;
  editingModel: CustomModel | null;
  showQuickConfig: boolean;

  setActiveSection: (section: SettingsSection) => void;
  setShowAddModelDialog: (v: boolean, editModel?: CustomModel | null) => void;
  setShowQuickConfig: (v: boolean) => void;
  setDefaultModelId: (id: string | null) => void;

  loadModels: () => Promise<void>;
  loadConfig: () => Promise<void>;
  addCustomModel: (model: CustomModel) => Promise<void>;
  updateCustomModel: (oldId: string, model: CustomModel) => Promise<void>;
  removeCustomModel: (modelId: string) => Promise<void>;
  setProviderAuth: (providerKey: string, apiKey: string) => Promise<void>;
  removeProvider: (providerKey: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  activeSection: "models",
  models: [],
  customModels: [],
  configuredProviders: new Set<string>(),
  defaultModelId: null,
  configBaseHash: null,
  showAddModelDialog: false,
  editingModel: null,
  showQuickConfig: false,

  setActiveSection: (section) => set({ activeSection: section }),
  setShowAddModelDialog: (v, editModel) =>
    set({ showAddModelDialog: v, editingModel: editModel ?? null }),
  setShowQuickConfig: (v) => set({ showQuickConfig: v }),
  setDefaultModelId: (id) => set({ defaultModelId: id }),

  loadModels: async () => {
    try {
      const result = await gateway.request<{ models: ModelInfo[] }>("models.list", {});
      set({ models: result.models });
    } catch {
      // Gateway might not be ready
    }
  },

  loadConfig: async () => {
    try {
      // Try gateway first (has hash + runtime state)
      const result = await gateway.request<{
        config: Record<string, unknown>;
        hash: string;
      }>("config.get", {});
      set({ configBaseHash: result.hash });

      const cfg = result.config as {
        models?: {
          providers?: Record<string, ProviderConfig>;
        };
        agents?: {
          defaults?: { model?: string };
        };
      };
      const customModels = parseCustomProvidersOnly(cfg.models?.providers);
      const configuredProviders = new Set(Object.keys(cfg.models?.providers ?? {}));
      const defaultModelId = cfg.agents?.defaults?.model ?? null;
      set({ customModels, configuredProviders, defaultModelId });
    } catch {
      // Gateway not ready — fall back to reading file directly
      try {
        const config = await readConfigFile();
        const cfg = config as {
          models?: { providers?: Record<string, ProviderConfig> };
          agents?: { defaults?: { model?: string } };
        };
        const customModels = parseCustomProvidersOnly(cfg.models?.providers);
        const configuredProviders = new Set(Object.keys(cfg.models?.providers ?? {}));
        const defaultModelId = cfg.agents?.defaults?.model ?? null;
        set({ customModels, configuredProviders, defaultModelId });
      } catch {
        // Config file not available either
      }
    }
  },

  addCustomModel: async (model) => {
    const config = await readConfigFile();
    const cfg = config as { models?: { providers?: Record<string, unknown> } };
    const { builtIn } = splitProviders(cfg.models?.providers);

    const currentCustomModels = parseCustomProvidersOnly(
      cfg.models?.providers as Record<string, ProviderConfig> | undefined,
    );
    const updated = [...currentCustomModels, model];
    const customProviders = buildProvidersPatch(updated);

    const providers = { ...builtIn, ...customProviders };
    const models = { ...cfg.models, providers };
    const newConfig = { ...config, models };
    await writeConfigAndRestart(newConfig);
    await get().loadConfig();
    await get().loadModels();
  },

  updateCustomModel: async (oldId, model) => {
    const config = await readConfigFile();
    const cfg = config as { models?: { providers?: Record<string, unknown> } };
    const { builtIn } = splitProviders(cfg.models?.providers);

    const currentCustomModels = parseCustomProvidersOnly(
      cfg.models?.providers as Record<string, ProviderConfig> | undefined,
    );
    const updated = currentCustomModels.map((m) => (m.id === oldId ? model : m));
    const customProviders = buildProvidersPatch(updated);

    const providers = { ...builtIn, ...customProviders };
    const models = { ...cfg.models, providers };
    const newConfig = { ...config, models };
    await writeConfigAndRestart(newConfig);
    await get().loadConfig();
    await get().loadModels();
  },

  removeCustomModel: async (modelId) => {
    const config = await readConfigFile();
    const cfg = config as { models?: { providers?: Record<string, unknown> } };
    const { builtIn } = splitProviders(cfg.models?.providers);

    const currentCustomModels = parseCustomProvidersOnly(
      cfg.models?.providers as Record<string, ProviderConfig> | undefined,
    );
    const updated = currentCustomModels.filter((m) => m.id !== modelId);
    const customProviders = buildProvidersPatch(updated);

    const providers = { ...builtIn, ...customProviders };
    const models = { ...cfg.models, providers };
    const newConfig = { ...config, models };
    await writeConfigAndRestart(newConfig);
    await get().loadConfig();
    await get().loadModels();
  },

  setProviderAuth: async (key, apiKey) => {
    const defaults = PROVIDER_DEFAULTS[key];
    if (!defaults) {
      throw new Error(`Unknown provider "${key}". Use Custom Model to configure manually.`);
    }

    // Get model definitions from models.list for this provider
    const { models: allModels } = get();
    const providerModels = allModels
      .filter((m) => m.provider === key)
      .map((m) => ({
        id: m.id,
        name: m.name,
        reasoning: m.reasoning ?? false,
        input: ["text"] as string[],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: m.contextWindow ?? 128000,
        maxTokens: 8192,
      }));

    const config = await readConfigFile();
    const cfg = config as { models?: { providers?: Record<string, unknown> } };
    const existingProviders = cfg.models?.providers ?? {};
    const existingEntry = (existingProviders[key] ?? {}) as Record<string, unknown>;

    const providerEntry: Record<string, unknown> = {
      ...existingEntry,
      baseUrl: defaults.baseUrl,
      api: defaults.api,
      apiKey,
    };
    if (providerModels.length > 0) {
      providerEntry.models = providerModels;
    } else {
      providerEntry.models = existingEntry.models ?? [];
    }

    const providers = { ...existingProviders, [key]: providerEntry };
    const models = { ...cfg.models, providers };
    const newConfig = { ...config, models };
    await writeConfigAndRestart(newConfig);
    await get().loadConfig();
    await get().loadModels();
  },

  removeProvider: async (key) => {
    const config = await readConfigFile();
    const cfg = config as { models?: { providers?: Record<string, unknown> } };
    const existingProviders = { ...cfg.models?.providers } as Record<string, unknown>;
    delete existingProviders[key];

    const models = { ...cfg.models, providers: existingProviders };
    const newConfig = { ...config, models };
    await writeConfigAndRestart(newConfig);
    await get().loadConfig();
    await get().loadModels();
  },
}));
