import { create } from "zustand";
import { gateway } from "../api/gateway-client";

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
function buildProvidersPatch(models: CustomModel[]): Record<string, unknown> {
  const grouped: Record<string, CustomModel[]> = {};
  for (const m of models) {
    const key = providerKey(m.provider);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  const providers: Record<string, unknown> = {};
  for (const [key, group] of Object.entries(grouped)) {
    const first = group[0];
    providers[key] = {
      baseUrl: first.baseUrl,
      ...(first.apiKey ? { apiKey: first.apiKey } : {}),
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

/** Parse models.providers from config into CustomModel[] */
function parseProvidersToCustomModels(
  providers: Record<string, ProviderConfig> | undefined,
): CustomModel[] {
  if (!providers) return [];
  const result: CustomModel[] = [];
  for (const [, provCfg] of Object.entries(providers)) {
    const protocol =
      provCfg.api === "anthropic-messages" ? "Anthropic" : "OpenAI";
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

interface SettingsState {
  activeSection: SettingsSection;
  models: ModelInfo[];
  customModels: CustomModel[];
  selectedModelId: string | null;
  configBaseHash: string | null;
  showAddModelDialog: boolean;
  showQuickConfig: boolean;

  setActiveSection: (section: SettingsSection) => void;
  setShowAddModelDialog: (v: boolean) => void;
  setShowQuickConfig: (v: boolean) => void;
  setSelectedModelId: (id: string) => void;

  loadModels: () => Promise<void>;
  loadConfig: () => Promise<void>;
  addCustomModel: (model: CustomModel) => Promise<void>;
  removeCustomModel: (modelId: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  activeSection: "models",
  models: [],
  customModels: [],
  selectedModelId: null,
  configBaseHash: null,
  showAddModelDialog: false,
  showQuickConfig: false,

  setActiveSection: (section) => set({ activeSection: section }),
  setShowAddModelDialog: (v) => set({ showAddModelDialog: v }),
  setShowQuickConfig: (v) => set({ showQuickConfig: v }),
  setSelectedModelId: (id) => set({ selectedModelId: id }),

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
      const result = await gateway.request<{
        config: Record<string, unknown>;
        hash: string;
      }>("config.get", {});
      set({ configBaseHash: result.hash });

      // Extract custom models from models.providers config
      const cfg = result.config as {
        models?: {
          providers?: Record<string, ProviderConfig>;
        };
      };
      const customModels = parseProvidersToCustomModels(cfg.models?.providers);
      set({ customModels });
    } catch {
      // Config might not be available
    }
  },

  addCustomModel: async (model) => {
    let { customModels, configBaseHash } = get();
    // Ensure we have a fresh baseHash before patching
    if (!configBaseHash) {
      await get().loadConfig();
      configBaseHash = get().configBaseHash;
    }
    const updated = [...customModels, model];
    const providers = buildProvidersPatch(updated);
    try {
      await gateway.request("config.patch", {
        baseHash: configBaseHash,
        raw: JSON.stringify({ models: { providers } }),
      });
      set({ customModels: updated });
      // Reload config to get fresh hash for next operation
      await get().loadConfig();
    } catch (err) {
      throw err;
    }
  },

  removeCustomModel: async (modelId) => {
    let { customModels, configBaseHash } = get();
    if (!configBaseHash) {
      await get().loadConfig();
      configBaseHash = get().configBaseHash;
    }
    const updated = customModels.filter((m) => m.id !== modelId);
    const providers = buildProvidersPatch(updated);
    try {
      await gateway.request("config.patch", {
        baseHash: configBaseHash,
        raw: JSON.stringify({ models: { providers } }),
      });
      set({ customModels: updated });
      await get().loadConfig();
    } catch (err) {
      throw err;
    }
  },
}));
