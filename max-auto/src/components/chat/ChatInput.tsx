import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../../stores/chat-store";

export function ChatInput() {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const streaming = useChatStore((s) => s.streaming);
  const abortGeneration = useChatStore((s) => s.abortGeneration);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleSubmit() {
    if (streaming) {
      abortGeneration();
      return;
    }
    if (!text.trim()) return;
    sendMessage(text.trim());
    setText("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }

  return (
    <div className="border-t border-[var(--color-border)] p-3 bg-[var(--color-surface)]">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] overflow-hidden"
        />
        <button
          onClick={handleSubmit}
          className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
            streaming
              ? "bg-red-600 hover:bg-red-700"
              : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]"
          }`}
        >
          {streaming ? "Stop" : "Send"}
        </button>
      </div>
    </div>
  );
}
