import { useEffect, useRef } from "react";
import { useChatStore, type ChatMessage as ChatMsg } from "../../stores/chat-store";
import { useSettingsStore } from "../../stores/settings-store";
import { useAppStore } from "../../stores/app-store";
import { ChatInput } from "./ChatInput";

function ChatMessage({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-[var(--color-accent)] text-white"
            : "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)]"
        }`}
      >
        {msg.content || (msg.streaming ? <BlinkingCursor /> : "")}
      </div>
    </div>
  );
}

function BlinkingCursor() {
  return <span className="inline-block w-2 h-4 bg-[var(--color-text-muted)] animate-pulse" />;
}

function WelcomeScreen() {
  const setShowQuickConfig = useSettingsStore((s) => s.setShowQuickConfig);
  const customModels = useSettingsStore((s) => s.customModels);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const setActiveSection = useSettingsStore((s) => s.setActiveSection);

  const hasModel = customModels.length > 0;

  const goToModelSettings = () => {
    setActiveSection("models");
    setCurrentPage("settings");
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
      {/* Branding */}
      <div className="text-center">
        <div className="text-4xl mb-3">🦞</div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">AutoClaw</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-2 max-w-md">
          Describe your goal, and AutoClaw will execute step by step with real-time feedback
        </p>
      </div>

      {/* Model setup reminder */}
      {!hasModel && (
        <button
          onClick={goToModelSettings}
          className="w-72 p-4 rounded-xl bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 hover:border-[var(--color-warning)] transition-colors text-left group"
        >
          <h3 className="text-sm font-medium text-[var(--color-warning)]">
            Set Up a Model
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            No model configured yet. Add a model with an API key to start chatting.
          </p>
        </button>
      )}
    </div>
  );
}

export function ChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const selectedAgentId = useChatStore((s) => s.selectedAgentId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!selectedAgentId) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">
        <p>Select an agent to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && <WelcomeScreen />}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}
      </div>
      <ChatInput />
    </div>
  );
}
