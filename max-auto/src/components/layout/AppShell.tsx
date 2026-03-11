import { useEffect } from "react";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "../chat/Sidebar";
import { ChatPanel } from "../chat/ChatPanel";
import { GatewayStatus } from "../common/GatewayStatus";
import { SettingsPage } from "../../pages/SettingsPage";
import { QuickConfigModal } from "../settings/QuickConfigModal";
import { gateway } from "../../api/gateway-client";
import { getGatewayToken } from "../../api/tauri-commands";
import { useAppStore } from "../../stores/app-store";
import { useChatStore } from "../../stores/chat-store";
import { useSettingsStore } from "../../stores/settings-store";

export function AppShell() {
  const port = useAppStore((s) => s.gatewayPort);
  const currentPage = useAppStore((s) => s.currentPage);
  const setGatewayConnected = useAppStore((s) => s.setGatewayConnected);
  const loadAgents = useChatStore((s) => s.loadAgents);
  const showQuickConfig = useSettingsStore((s) => s.showQuickConfig);
  const hasModel = useSettingsStore((s) => s.customModels.length > 0);

  useEffect(() => {
    // Connect to gateway WebSocket
    gateway.setStatusCallback((connected) => {
      setGatewayConnected(connected);
      if (connected) {
        loadAgents();
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

    // Listen for chat streaming events
    const unsubChat = gateway.on("chat-event", (payload) => {
      const data = payload as {
        runId?: string;
        sessionKey?: string;
        state?: string;
        message?: { content?: string };
      };

      const store = useChatStore.getState();

      if (data.runId && !store.currentRunId) {
        store.setCurrentRunId(data.runId);
      }

      if (data.state === "delta" && data.message?.content) {
        store.updateStreamingMessage(data.message.content);
      } else if (data.state === "final" || data.state === "aborted" || data.state === "error") {
        store.finalizeStreaming();
      }
    });

    return () => {
      unsubChat();
      gateway.disconnect();
    };
  }, [port]);

  return (
    <div className="flex flex-col h-screen">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {currentPage === "home" && hasModel && <Sidebar />}
        <div className="flex-1 flex flex-col">
          {currentPage === "home" ? <ChatPanel /> : <SettingsPage />}
          {currentPage === "home" && <GatewayStatus />}
        </div>
      </div>
      {showQuickConfig && hasModel && <QuickConfigModal />}
    </div>
  );
}
