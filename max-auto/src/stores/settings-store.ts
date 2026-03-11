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

      // Extract custom models from config if present
      const cfg = result.config as {
        llm?: {
          customModels?: CustomModel[];
          selectedModel?: string;
        };
      };
      if (cfg.llm?.customModels) {
        set({ customModels: cfg.llm.customModels });
      }
      if (cfg.llm?.selectedModel) {
        set({ selectedModelId: cfg.llm.selectedModel });
      }
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
    try {
      await gateway.request("config.patch", {
        baseHash: configBaseHash,
        raw: JSON.stringify({ llm: { customModels: updated } }),
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
    try {
      await gateway.request("config.patch", {
        baseHash: configBaseHash,
        raw: JSON.stringify({ llm: { customModels: updated } }),
      });
      set({ customModels: updated });
      await get().loadConfig();
    } catch (err) {
      throw err;
    }
  },
}));
