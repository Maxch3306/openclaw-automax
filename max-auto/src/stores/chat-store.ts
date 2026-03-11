import { create } from "zustand";
import { gateway } from "../api/gateway-client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  streaming?: boolean;
}

export interface Agent {
  agentId: string;
  name: string;
  emoji?: string;
  avatar?: string;
  workspace?: string;
}

interface ChatState {
  messages: ChatMessage[];
  agents: Agent[];
  selectedAgentId: string | null;
  sessionKey: string | null;
  streaming: boolean;
  currentRunId: string | null;

  setAgents: (agents: Agent[]) => void;
  selectAgent: (agentId: string) => void;
  addMessage: (msg: ChatMessage) => void;
  updateStreamingMessage: (content: string) => void;
  finalizeStreaming: () => void;
  clearMessages: () => void;
  setStreaming: (v: boolean) => void;
  setSessionKey: (key: string | null) => void;
  setCurrentRunId: (id: string | null) => void;

  // Actions
  sendMessage: (text: string) => Promise<void>;
  loadAgents: () => Promise<void>;
  abortGeneration: () => Promise<void>;
}

let idCounter = 0;
function nextId() {
  return `msg-${++idCounter}-${Date.now()}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  agents: [],
  selectedAgentId: null,
  sessionKey: null,
  streaming: false,
  currentRunId: null,

  setAgents: (agents) => set({ agents }),
  selectAgent: (agentId) => {
    set({ selectedAgentId: agentId, messages: [], sessionKey: null });
  },
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateStreamingMessage: (content) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last?.streaming) {
        msgs[msgs.length - 1] = { ...last, content: last.content + content };
      }
      return { messages: msgs };
    }),
  finalizeStreaming: () =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last?.streaming) {
        msgs[msgs.length - 1] = { ...last, streaming: false };
      }
      return { messages: msgs, streaming: false, currentRunId: null };
    }),
  clearMessages: () => set({ messages: [], sessionKey: null }),
  setStreaming: (v) => set({ streaming: v }),
  setSessionKey: (key) => set({ sessionKey: key }),
  setCurrentRunId: (id) => set({ currentRunId: id }),

  sendMessage: async (text) => {
    const { selectedAgentId } = get();
    if (!text.trim() || !gateway.connected) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: nextId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, userMsg] }));

    // Create streaming placeholder
    const assistantMsg: ChatMessage = {
      id: nextId(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      streaming: true,
    };
    set((s) => ({
      messages: [...s.messages, assistantMsg],
      streaming: true,
    }));

    try {
      // Resolve or create session
      let sessionKey = get().sessionKey;
      if (!sessionKey) {
        const resolved = await gateway.request<{ session: { key: string } }>(
          "sessions.resolve",
          { agentId: selectedAgentId }
        );
        sessionKey = resolved.session.key;
        set({ sessionKey });
      }

      const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      await gateway.request("chat.send", {
        sessionKey,
        message: text,
        idempotencyKey,
      });
    } catch (err) {
      // If send fails, update the streaming message with error
      set((s) => {
        const msgs = [...s.messages];
        const last = msgs[msgs.length - 1];
        if (last?.streaming) {
          msgs[msgs.length - 1] = {
            ...last,
            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
            streaming: false,
          };
        }
        return { messages: msgs, streaming: false };
      });
    }
  },

  loadAgents: async () => {
    try {
      const result = await gateway.request<{
        defaultId: string;
        agents: Agent[];
      }>("agents.list", {});
      set({
        agents: result.agents,
        selectedAgentId: get().selectedAgentId ?? result.defaultId,
      });
    } catch {
      // Gateway might not be ready yet
    }
  },

  abortGeneration: async () => {
    const { sessionKey, currentRunId } = get();
    if (!sessionKey) return;
    try {
      await gateway.request("chat.abort", { sessionKey, runId: currentRunId });
    } catch {
      // ignore
    }
    get().finalizeStreaming();
  },
}));
