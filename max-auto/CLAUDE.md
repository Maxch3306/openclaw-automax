## Project Principle

- **DO NOT modify any OpenClaw code.** All files outside `max-auto/` are treated as read-only upstream.
- **All new code must be written in the `max-auto/` folder.** We are building a wrapper around OpenClaw (similar to AutoClaw by Zhipu AI), not changing OpenClaw itself.

## What is MaxAuto

A vendor-free, open-source desktop app that wraps OpenClaw. No login, no credits, no vendor lock-in — just a double-click installer that manages OpenClaw's setup and provides a polished GUI.

## Tech Stack

- **Frontend:** React 19 + TypeScript, Tailwind CSS 3.4, Zustand 5 (state), Vite 6
- **Backend:** Tauri v2 (Rust), tokio, reqwest, serde
- **Communication:** WebSocket to OpenClaw gateway (`ws://127.0.0.1:18789`), Tauri IPC for Rust commands
- **Platforms:** Windows (.msi) + macOS (.dmg)
- **Package manager:** pnpm

## Project Structure

```
max-auto/
├── src/                          # React/TypeScript frontend
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Root (SetupPage or AppShell)
│   ├── global.css                # Tailwind + CSS variables (dark theme)
│   ├── api/
│   │   ├── gateway-client.ts     # WebSocket client for OpenClaw gateway
│   │   └── tauri-commands.ts     # Typed Tauri invoke() wrappers
│   ├── components/
│   │   ├── layout/               # AppShell, TitleBar
│   │   ├── chat/                 # ChatPanel, ChatInput, Sidebar
│   │   ├── settings/             # ModelsAndApiSection, AddModelDialog, QuickConfigModal
│   │   └── common/               # GatewayStatus
│   ├── pages/
│   │   ├── SetupPage.tsx         # First-run setup flow
│   │   └── SettingsPage.tsx      # Settings navigation + sections
│   └── stores/
│       ├── app-store.ts          # Global app state (setup, gateway, page)
│       ├── chat-store.ts         # Chat state + actions (send, abort, streaming)
│       └── settings-store.ts     # Settings state + model management
├── src-tauri/                    # Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json           # Window 1200x800, frameless, com.openclaw.maxauto
│   └── src/
│       ├── main.rs / lib.rs      # Tauri app builder
│       ├── commands/
│       │   ├── gateway.rs        # start/stop/status gateway process
│       │   ├── system.rs         # check Node.js, platform info
│       │   ├── setup.rs          # install Node.js 22, install OpenClaw
│       │   └── config.rs         # read/write openclaw.json
│       ├── state/
│       │   └── gateway_process.rs
│       └── tray/
│           └── menu.rs           # System tray icon + menu
├── docs/
│   ├── PLAN.md                   # Architecture & implementation roadmap
│   ├── gateway-protocol.md       # OpenClaw WebSocket protocol reference
│   ├── tauri-v2-guide.md         # Tauri v2 patterns
│   └── node-portable-install.md  # Node.js bundling strategy
└── ui-reference/                 # AutoClaw screenshot references
```

## Architecture

1. **Setup flow:** `App.tsx` checks `setupComplete` → shows `SetupPage` (installs Node.js + OpenClaw, starts gateway) or `AppShell`.
2. **Gateway lifecycle:** Rust spawns OpenClaw gateway as child process with isolated env under `~/.openclaw-maxauto/`.
3. **WebSocket protocol (v3):** `GatewayClient` connects, authenticates with token, sends request/response frames, subscribes to events (`chat-event`, `presence`).
4. **Chat flow:** Select agent from Sidebar → send message via `gateway.request("chat.send")` → stream response via `chat-event` events.
5. **Settings:** Custom model management via `config.patch` gateway calls.

## Environment Isolation

All runtime files live under `~/.openclaw-maxauto/` (node/, openclaw/, config/, sessions/) to avoid conflicts with global installs.

## Scripts

```bash
pnpm dev       # Vite dev server + Tauri dev mode
pnpm build     # TypeScript check + Vite production build
pnpm tauri     # Tauri CLI commands
```
