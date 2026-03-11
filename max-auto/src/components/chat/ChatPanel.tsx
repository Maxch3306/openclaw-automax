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
  const customModels = useSettingsStore((s) => s.customModels);
  const selectedModelId = useSettingsStore((s) => s.selectedModelId);
  const setShowQuickConfig = useSettingsStore((s) => s.setShowQuickConfig);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const setActiveSection = useSettingsStore((s) => s.setActiveSection);

  const hasModel = customModels.length > 0;

  const goToModelSettings = () => {
    setActiveSection("models");
    setCurrentPage("settings");
  };

  // Find current model display name
  const currentModel = customModels.find((m) => m.id === selectedModelId) ?? customModels[0];

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

      {/* When models exist: show current model + quick setup */}
      {hasModel && (
        <div className="flex flex-col items-center gap-3 w-80">
          {/* Current model badge */}
          <button
            onClick={goToModelSettings}
            className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Current Model</p>
                <p className="text-sm font-medium text-[var(--color-text)] mt-0.5">
                  {currentModel?.displayName ?? "Not selected"}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-muted)]">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>

          {/* Quick Setup card */}
          <button
            onClick={() => setShowQuickConfig(true)}
            className="w-full px-4 py-3 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 hover:border-[var(--color-accent)] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--color-accent)]">Quick Setup</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Configure your name, role, and workspace
                </p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* When no models: show setup reminder */}
      {!hasModel && (
        <button
          onClick={goToModelSettings}
          className="w-80 p-4 rounded-xl bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 hover:border-[var(--color-warning)] transition-colors text-left group"
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
