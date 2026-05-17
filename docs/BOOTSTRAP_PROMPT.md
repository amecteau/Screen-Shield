# Claude Code Implementation Prompt

> Copy everything below this line and paste it into Claude Code in VS Code
> with the ScreenShield project open. Claude Code will read CLAUDE.md
> automatically for conventions, versions, and security rules.

---

I need you to implement the core application bootstrap and wiring for the ScreenShield Electron app. The project scaffold already exists — read CLAUDE.md first for all architecture decisions, pinned versions, security rules, and conventions. Then read docs/ARCHITECTURE.md for the design rationale and docs/HARNESS.md for the quality control strategy.

The following files already exist and are complete — do NOT modify them:
- src/renderer/shared/types/profile.types.ts (all shared types)
- src/renderer/shared/types/index.ts (barrel export)
- src/renderer/shared/utils/geometry.ts (region math)
- src/renderer/shared/utils/geometry.test.ts (geometry tests)
- src/main/profiles/profile.schema.ts (Zod schemas)
- src/main/profiles/profile.service.ts (ProfileService with CRUD)
- src/main/profiles/profile.service.test.ts (profile tests)
- src/main/ipc/ipc.channels.ts (channel constants)
- All config files (tsconfig, vite configs, vitest, electron-builder, eslint, prettier)

## What to build, in this order:

### 1. src/main/app/app.ts — Application lifecycle manager

Create an AppManager class that handles:
- `app.requestSingleInstanceLock()` — if lock fails, call `app.quit()` immediately
- On second-instance event, focus the existing settings window if open
- `app.whenReady()` — triggers initialization (calls back to index.ts)
- `app.on('window-all-closed')` — do NOT quit on macOS or any platform (this is a tray app, it stays alive with no windows)
- `app.on('activate')` on macOS — show settings window if no windows visible
- Export a function `initializeApp(onReady: () => Promise<void>): void`

### 2. src/main/windows/window.factory.ts — Secure window factory

Create a factory that enforces security defaults on every BrowserWindow. Every window created through this factory MUST have:
```typescript
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  preload: preloadPath, // passed as parameter
}
```
Plus the CSP header set via `session.defaultSession.webRequest.onHeadersReceived`.

Provide two factory functions:
- `createOverlayWindow(preloadPath: string): BrowserWindow` — frameless, transparent, always-on-top, fullscreen, `setIgnoreMouseEvents(true)`, `setSkipTaskbar(true)`. Load `dist/renderer/overlay/index.html`.
- `createSettingsWindow(preloadPath: string): BrowserWindow` — normal window, 800x600, centered, hidden initially. Load `dist/renderer/settings/index.html`. On close, hide instead of destroy (reuse the window).

### 3. src/main/windows/overlay.window.ts — Overlay window controller

Wraps the overlay BrowserWindow with methods:
- `show()` / `hide()`
- `updateRegions(regions: readonly BlurRegion[])` — sends regions to the renderer via IPC using the `OVERLAY_UPDATE_REGIONS` channel
- `setSettingsMode(active: boolean)` — toggles `setIgnoreMouseEvents(!active)` and sends `OVERLAY_SETTINGS_MODE` to the renderer. When settings mode is active, the overlay should show a subtle tinted background so the user can see the interactive area.
- `destroy()`

### 4. src/main/windows/settings.window.ts — Settings window controller

Wraps the settings BrowserWindow with methods:
- `show()` — shows and focuses the window
- `hide()` — hides the window
- `isVisible(): boolean`
- On close event, prevent default and hide instead of destroying

### 5. src/main/tray/tray.service.ts — System tray manager

Create a TrayService class that:
- Creates a Tray with the app icon from `assets/icons/`
- Builds a dynamic context menu using `Menu.buildFromTemplate()` with:
  - Header: "ScreenShield" (disabled label)
  - Separator
  - "Enable" / "Disable" toggle (checkbox) — calls `profileService.setActiveProfile(id | null)`
  - Separator
  - Radio group listing all profiles by name — the active profile has `checked: true`
  - Separator
  - "New Profile..." — calls `profileService.createBlankProfile('Untitled')`, sets it active, opens settings
  - "Edit Current..." — opens settings window in settings mode
  - Separator
  - "Quit" — calls `app.quit()`
- Expose a `refresh()` method that rebuilds the menu (call after any profile change)
- Constructor takes `profileService: ProfileService`, callbacks for `onOpenSettings`, `onToggleActive`, `onSelectProfile`

### 6. src/main/ipc/ipc.handlers.ts — IPC handler registration

Create a `registerIpcHandlers` function that:
- Takes `profileService: ProfileService` and `overlayController` and `settingsController` as parameters
- Uses `ipcMain.handle()` for each channel defined in `ipc.channels.ts`
- Every handler wraps its logic in try/catch and returns `IpcResult<T>`
- Every handler validates its input using the Zod schemas from `profile.schema.ts`
- After any profile mutation (save/delete/setActive), sends updated regions to the overlay and refreshes the tray menu

Write `ipc.handlers.test.ts` with tests that mock ipcMain.handle and verify:
- Each channel is registered
- Invalid payloads are rejected with descriptive errors
- Successful operations return the expected IpcResult shape

### 7. src/preload/settings.preload.ts — Settings renderer preload

Expose the `SettingsApi` interface (from shared types) via `contextBridge.exposeInMainWorld('screenShield', { ... })`. Each method calls `ipcRenderer.invoke(CHANNEL, data)` using the channel constants. NEVER expose `ipcRenderer` directly.

### 8. src/preload/overlay.preload.ts — Overlay renderer preload

Expose the `OverlayApi` interface via `contextBridge.exposeInMainWorld('screenShield', { ... })`. Use `ipcRenderer.on()` for the two event channels (regions update and settings mode change). NEVER expose `ipcRenderer` directly.

### 9. src/renderer/overlay/index.html — Overlay HTML shell

Minimal HTML with:
- CSP meta tag: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">`
- Transparent background (`background: transparent` on body)
- A single `<div id="overlay-root"></div>`
- Script tag loading `overlay.ts`

### 10. src/renderer/overlay/overlay.ts — Overlay renderer logic

NO React. Pure TypeScript DOM manipulation:
- Listen for regions updates via `window.screenShield.onRegionsUpdate()`
- For each region, create an absolutely-positioned `<div>` with:
  - `position: absolute`
  - `left/top/width/height` converted from percentage to viewport units (vw/vh)
  - `backdrop-filter: blur(Xpx)` where X is the region's blurStrength
  - `background: rgba(0, 0, 0, 0.01)` (near-invisible but enough for backdrop-filter to work)
- Listen for settings mode changes via `window.screenShield.onSettingsModeChange()`
- In settings mode: add a subtle overlay tint and visual borders around blur regions
- Clear and recreate all divs on every update (the region count is small, no optimization needed)

### 11. src/renderer/settings/index.html — Settings HTML shell

Standard HTML with:
- CSP meta tag (same as overlay)
- `<div id="settings-root"></div>`
- Script tag loading the React entry point

### 12. src/main/index.ts — Main entry point (wire everything together)

This is the orchestration file. It should:
```
1. Import AppManager, ProfileService, TrayService, window controllers, IPC handlers
2. Create electron-store instance wrapping it to match the ProfileStore interface
3. Create ProfileService with the store
4. Call initializeApp with an onReady callback that:
   a. Creates overlay window controller
   b. Creates settings window controller  
   c. Creates TrayService with profile service and callbacks
   d. Registers IPC handlers
   e. Loads active profile regions into the overlay
   f. Refreshes the tray menu
```

Keep this file thin — it's pure wiring, no business logic.

## General rules for all files:

- Follow every convention in CLAUDE.md (naming, imports, error handling, security)
- Use the IpcResult<T> return type for all IPC communication — never throw across IPC
- Use the existing Zod schemas for validation — don't create new ones
- Use the existing IPC channel constants — no magic strings
- Use the existing type definitions — don't redefine BlurProfile, BlurRegion, etc.
- Co-locate tests as `*.test.ts` next to each source file
- Add explicit TypeScript return types on all exported functions
- Group imports: node builtins → electron → external deps → internal modules
- Handle errors gracefully — log with context, never crash the main process

## After implementation:

Run `npx vitest run` and make sure all existing tests still pass plus any new tests you wrote. Run `npx tsc --noEmit` to verify typecheck passes. If there are any ESLint issues, fix them.
