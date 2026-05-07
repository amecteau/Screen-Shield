# ScreenShield Architecture

## Overview

ScreenShield is a system-tray Electron application that renders a transparent overlay
on top of all windows. Users define rectangular regions that appear blurred during
screen shares, protecting sensitive content. Blur profiles are stored locally and
switched via the tray menu.

## Architecture diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Electron Application (TypeScript)                               │
│                                                                 │
│  ┌──────────────────────┐     IPC      ┌──────────────────────┐ │
│  │   Main Process        │◄───────────►│  Overlay Window       │ │
│  │                       │             │  (frameless, AOT)     │ │
│  │  • Tray manager       │             │  • Canvas blur render │ │
│  │  • Window orchestrator│             │  • Click-through mode │ │
│  │  • Profile service    │             └──────────────────────┘ │
│  │  • IPC handlers       │                                     │
│  │                       │     IPC      ┌──────────────────────┐ │
│  │                       │◄───────────►│  Settings Window      │ │
│  └───────────┬───────────┘             │  (React + editor)    │ │
│              │                          │  • Drag-to-select    │ │
│              ▼                          │  • Profile manager   │ │
│  ┌──────────────────────┐              └──────────────────────┘ │
│  │  Local Profile Store  │                                      │
│  │  (electron-store/JSON)│                                      │
│  └──────────────────────┘                                      │
│                                                                 │
│  ┌──────────────────────┐              ┌──────────────────────┐ │
│  │  Build: Vite 7.3      │              │  Test: Vitest 4.1    │ │
│  │  Package: e-builder   │              │  E2E: Playwright     │ │
│  └──────────────────────┘              └──────────────────────┘ │
│                                                                 │
│              ┌─────────────────────────────────┐                │
│              │  CI/CD: GitHub Actions (matrix)  │                │
│              │  Win + Mac + Linux               │                │
│              └─────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## Process model

### Main process
Single Node.js process managing application lifecycle, system tray, window creation,
profile persistence, and IPC routing. This is the only process with filesystem access.

### Overlay renderer
Lightweight renderer with NO React. Receives region coordinates via IPC and renders
blur patches using CSS `backdrop-filter: blur()` on absolutely-positioned divs, or
paints to a `<canvas>`. Runs with `setIgnoreMouseEvents(true)` in normal mode so all
user input passes through to underlying applications.

### Settings renderer
React application for profile management and region editing. Users enter "settings mode"
via the tray menu, which opens this window and switches the overlay to interactive mode
(`setIgnoreMouseEvents(false)`). The region editor provides drag-to-create, click-to-select,
resize handles, and delete functionality.

### Preload scripts
Each renderer has its own preload script exposing a typed, minimal API via
`contextBridge.exposeInMainWorld()`. The overlay preload exposes region update
listeners. The settings preload exposes profile CRUD operations and region
save/load functions.

## Data model

### BlurProfile
```typescript
interface BlurProfile {
  readonly id: string;            // crypto.randomUUID()
  name: string;                   // User-assigned display name
  regions: readonly BlurRegion[]; // Ordered list of blur regions
  readonly createdAt: string;     // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

### BlurRegion
```typescript
interface BlurRegion {
  readonly id: string;     // crypto.randomUUID()
  x: number;               // Percentage of screen width (0–100)
  y: number;               // Percentage of screen height (0–100)
  width: number;           // Percentage of screen width
  height: number;          // Percentage of screen height
  blurStrength: number;    // Blur radius in px (default 20)
}
```

Using percentages makes profiles portable across monitor resolutions.

## Key design decisions

### ADR-001: Electron over Tauri
Electron provides consistent Chromium rendering, mature `desktopCapturer`,
`setIgnoreMouseEvents()` for click-through, and battle-tested tray API.
Tauri's transparent window support has known macOS issues and lacks
per-region hit-testing without polling workarounds.

### ADR-002: Vite + electron-builder over Electron Forge
Electron Forge's Vite plugin is marked experimental (since v7.5.0).
Using Vite directly for bundling and electron-builder for packaging
provides separation of concerns and avoids coupling to an unstable adapter.

### ADR-003: No React in overlay renderer
The overlay must repaint blur regions with minimal latency. React's virtual
DOM diffing is unnecessary overhead for positioning a handful of CSS-blurred
divs. A thin TypeScript module receives coordinates via IPC and directly
manipulates the DOM.

### ADR-004: Percentage-based coordinates
Storing region coordinates as percentages of screen dimensions makes profiles
portable across resolutions and multi-monitor setups where display scaling varies.

### ADR-005: electron-store for persistence
Simple, atomic-write JSON store. Profiles serialize to the platform-standard
config directory. No database complexity needed for this data model.

## Security model

See CLAUDE.md security rules for the complete list. In summary:
- Full context isolation and sandbox on all renderers
- Minimal preload API surface via contextBridge
- Zod validation on every IPC payload
- Strict CSP headers
- No remote module, no eval, no shell.openExternal with user input
