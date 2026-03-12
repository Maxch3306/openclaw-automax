import { useEffect } from "react";
import { gateway } from "../../api/gateway-client";
import { getGatewayToken } from "../../api/tauri-commands";
import { SettingsPage } from "../../pages/SettingsPage";
import { useAppStore } from "../../stores/app-store";
import { useChatStore } from "../../stores/chat-store";
import { useSettingsStore } from "../../stores/settings-store";
import { ChatPanel } from "../chat/ChatPanel";
import { Sidebar } from "../chat/Sidebar";
import { GatewayStatus } from "../common/GatewayStatus";
import { QuickConfigModal } from "../settings/QuickConfigModal";

export function AppShell() {
  const port = useAppStore((s) => s.gatewayPort);
  const currentPage = useAppStore((s) => s.currentPage);
  const setGatewayConnected = useAppStore((s) => s.setGatewayConnected);
  const loadAgents = useChatStore((s) => s.loadAgents);
  const loadSessions = useChatStore((s) => s.loadSessions);
  const loadConfig = useSettingsStore((s) => s.loadConfig);
  const loadModels = useSettingsStore((s) => s.loadModels);
  const showQuickConfig = useSettingsStore((s) => s.showQuickConfig);
  const hasProvider = useSettingsStore((s) => s.configuredProviders.size > 0);

  useEffect(() => {
    // Connect to gateway WebSocket
    gateway.setStatusCallback((connected) => {
      setGatewayConnected(connected);
      if (connected) {
        void loadAgents();
        void loadSessions();
        void loadConfig();
        void loadModels();
      }
    });

    // Read token from config, then connect
    getGatewayToken()
      .then((token) => {
        gateway.connect(port, token);
      })
      .catch(() => {
        // No token available — connect without one
        gateway.connect(port);
      });

    // Use health events to reload config/models and as fallback source for agents
    const unsubHealth = gateway.on("health", (payload) => {
      // Reload config & models on every health event (catches post-restart updates)
      void loadConfig();
      void loadModels();

      const data = payload as {
        agents?: Array<{ agentId: string; isDefault?: boolean }>;
        defaultAgentId?: string;
      };
      if (data.agents && data.agents.length > 0) {
        const store = useChatStore.getState();
        if (store.agents.length === 0) {
          store.setAgents(
            data.agents.map((a) => ({
              agentId: a.agentId,
              name: a.agentId,
            })),
          );
          if (!store.selectedAgentId && data.defaultAgentId) {
            store.selectAgent(data.defaultAgentId);
          }
        }
      }
    });

    // Listen for chat streaming events
    const unsubChat = gateway.on("chat", (payload) => {
      const data = payload as {
        runId?: string;
        sessionKey?: string;
        state?: string;
        message?: {
          content?: Array<{ type: string; text?: string }> | string;
        };
      };

      const store = useChatStore.getState();

      if (data.runId && !store.currentRunId) {
        store.setCurrentRunId(data.runId);
      }

      if (data.state === "delta" && data.message?.content) {
        // Extract text from content blocks array
        let text = "";
        if (Array.isArray(data.message.content)) {
          text = data.message.content
            .filter((b) => b.type === "text" && b.text)
            .map((b) => b.text!)
            .join("");
        } else {
          text = String(data.message.content);
        }
        if (text) {
          store.updateStreamingMessage(text);
        }
      } else if (data.state === "final" || data.state === "aborted" || data.state === "error") {
        store.finalizeStreaming();
      }
    });

    return () => {
      unsubHealth();
      unsubChat();
      gateway.disconnect();
    };
  }, [port]);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        {currentPage === "home" && <Sidebar />}
        <div className="flex-1 flex flex-col">
          {currentPage === "home" ? <ChatPanel /> : <SettingsPage />}
          {currentPage === "home" && <GatewayStatus />}
        </div>
      </div>
      {showQuickConfig && hasProvider && <QuickConfigModal />}
    </div>
  );
}
