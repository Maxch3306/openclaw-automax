import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "../../stores/app-store";
import { gateway } from "../../api/gateway-client";

export function GatewayStatus() {
  const connected = useAppStore((s) => s.gatewayConnected);
  const [showDebug, setShowDebug] = useState(false);
  const [, forceUpdate] = useState(0);

  const refresh = useCallback(() => forceUpdate((n) => n + 1), []);

  useEffect(() => {
    gateway.setDebugCallback(refresh);
    return () => gateway.setDebugCallback(() => {});
  }, [refresh]);

  return (
    <div className="px-3 py-1">
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            connected ? "bg-[var(--color-success)]" : "bg-[var(--color-error)]"
          }`}
        />
        <span className="text-xs text-[var(--color-text-muted)]">
          {connected ? "Connected" : "Disconnected"}
        </span>
        <span className="text-xs text-[var(--color-text-muted)] opacity-50 ml-1">
          WS: {gateway.wsState}
        </span>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-[var(--color-accent)] ml-auto hover:underline"
        >
          {showDebug ? "Hide Debug" : "Debug"}
        </button>
      </div>
      {showDebug && (
        <div className="mt-1 p-2 bg-black/50 rounded text-[10px] font-mono text-green-400 max-h-48 overflow-y-auto whitespace-pre-wrap">
          <div className="mb-1 text-yellow-400">
            URL: {gateway.url || "(none)"} | WS: {gateway.wsState} | Connected: {String(connected)}
          </div>
          {gateway.debugLog.length === 0 ? (
            <div className="text-gray-500">No messages yet...</div>
          ) : (
            gateway.debugLog.map((line, i) => (
              <div key={i}>{line}</div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
