import { useEffect } from "react";
import { useChatStore } from "../../stores/chat-store";
import { useAppStore } from "../../stores/app-store";
import { gateway } from "../../api/gateway-client";

export function ModelSelector() {
  const agents = useChatStore((s) => s.agents);
  const selectedAgentId = useChatStore((s) => s.selectedAgentId);
  const selectAgent = useChatStore((s) => s.selectAgent);

  return (
    <div className="px-3 py-2 border-t border-[var(--color-border)]">
      <select
        value={selectedAgentId ?? ""}
        onChange={(e) => selectAgent(e.target.value)}
        className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
      >
        {agents.map((a) => (
          <option key={a.agentId} value={a.agentId}>
            {a.emoji ? `${a.emoji} ` : ""}{a.name}
          </option>
        ))}
        {agents.length === 0 && <option value="">No agents</option>}
      </select>
    </div>
  );
}

export function Sidebar() {
  const agents = useChatStore((s) => s.agents);
  const selectedAgentId = useChatStore((s) => s.selectedAgentId);
  const selectAgent = useChatStore((s) => s.selectAgent);
  const loadAgents = useChatStore((s) => s.loadAgents);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);

  useEffect(() => {
    if (gateway.connected) {
      loadAgents();
    }
    const unsub = gateway.on("presence", () => {
      loadAgents();
    });
    return unsub;
  }, []);

  return (
    <aside className="w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col">
      <div className="p-4">
        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Agents
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {agents.map((agent) => (
          <button
            key={agent.agentId}
            onClick={() => selectAgent(agent.agentId)}
            className={`w-full text-left p-3 rounded-lg mb-1 text-sm transition-colors ${
              selectedAgentId === agent.agentId
                ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[var(--color-text)]"
                : "hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
            }`}
          >
            {agent.emoji ? `${agent.emoji} ` : ""}{agent.name}
          </button>
        ))}
        {agents.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)] px-3 py-2">
            Connecting to gateway...
          </p>
        )}
      </div>
      <ModelSelector />
      {/* Settings button */}
      <div className="px-3 py-2 border-t border-[var(--color-border)]">
        <button
          onClick={() => setCurrentPage("settings")}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
