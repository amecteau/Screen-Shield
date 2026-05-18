# ScreenShield — Project Status

> **This is a living document.** Claude Code reads this file to understand what
> has been built, what to build next, and what constraints apply to each phase.
> After completing a phase, check off its tasks and update the status line.
>
> **Rule: Only implement ONE phase per session unless explicitly told otherwise.**
> Run tests after each phase. Do not proceed to the next phase if tests fail.

## Status overview

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Project scaffold & shared code | ✅ Complete |
| 1 | Application lifecycle | ✅ Complete |
| 2 | Secure window factory | ⬜ Not started |
| 3 | Window controllers | ⬜ Not started |
| 4 | System tray | ⬜ Not started |
| 5 | IPC handlers | ⬜ Not started |
| 6 | Preload scripts | ⬜ Not started |
| 7 | Overlay renderer | ⬜ Not started |
| 8 | Settings UI (React) | ⬜ Not started |
| 9 | Integration wiring (index.ts) | ⬜ Not started |
| 10 | E2E tests | ⬜ Not started |

---

## Phase 0 — Project scaffold & shared code ✅

All of these files are complete and tested. Do NOT modify them unless
a later phase reveals a necessary type change (document the reason).

- [x] `src/renderer/shared/types/profile.types.ts` — BlurProfile, BlurRegion, IpcResult, SettingsApi, OverlayApi
- [x] `src/renderer/shared/types/index.ts` — barrel export
- [x] `src/renderer/shared/utils/geometry.ts` — clamp, isValidPercentage, isValidRegion, regionToPixels, pixelsToRegion, regionsOverlap
- [x] `src/renderer/shared/utils/geometry.test.ts` — 20 tests
- [x] `src/main/profiles/profile.schema.ts` — Zod schemas for BlurRegion, BlurProfile, validation
- [x] `src/main/profiles/profile.service.ts` — ProfileService with CRUD, ProfileStore interface
- [x] `src/main/profiles/profile.service.test.ts` — 14 tests
- [x] `src/main/ipc/ipc.channels.ts` — IPC channel name constants
- [x] All config files (tsconfig, vite ×3, vitest, electron-builder, eslint, prettier)
- [x] CI/CD workflows (ci.yml, release.yml)
- [x] VS Code settings and extensions

---

## Phase 1 — Application lifecycle ✅

**File:** `src/main/app/app.ts`
**Tests:** `src/main/app/app.test.ts`

- [x] `app.requestSingleInstanceLock()` — quit immediately if lock fails
- [x] On `second-instance` event — focus existing settings window if open
- [x] `app.whenReady()` — call the `onReady` callback passed from index.ts
- [x] `app.on('window-all-closed')` — do NOT quit (tray app stays alive with no visible windows)
- [x] `app.on('activate')` (macOS) — show settings window if no windows are visible
- [x] Export: `initializeApp(onReady: () => Promise<void>, options?: AppManagerOptions): void`

11 tests passing. Full suite: 49/49. Typecheck: clean.

---

## Phase 2 — Secure window factory ⬜

**File:** `src/main/windows/window.factory.ts`
**Tests:** `src/main/windows/window.factory.test.ts`

Create a factory that enforces security defaults on every BrowserWindow:

- [ ] All windows get: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`
- [ ] CSP header set via `session.defaultSession.webRequest.onHeadersReceived` with: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`
- [ ] `createOverlayWindow(preloadPath: string): BrowserWindow`
  - Frameless, transparent, always-on-top, fullscreen
  - `setIgnoreMouseEvents(true)`
  - `setSkipTaskbar(true)`
  - Loads `dist/renderer/overlay/index.html`
- [ ] `createSettingsWindow(preloadPath: string): BrowserWindow`
  - Normal window, 800×600, centered, hidden initially
  - Loads `dist/renderer/settings/index.html`
  - On close event: prevent default, hide instead of destroy

**Tests to write:**
- Verify security webPreferences are set correctly on both window types
- Verify overlay window has transparent + frameless + alwaysOnTop
- Verify settings window hides on close instead of destroying

**Security note:** These tests are a computational feedback sensor that guards the
most critical security boundary in the app. If any test here fails, nothing else matters.

**When done:** Check off tasks, set status to ✅, run tests.

---

## Phase 3 — Window controllers ⬜

**Files:** `src/main/windows/overlay.window.ts`, `src/main/windows/settings.window.ts`
**Tests:** co-located `.test.ts` files

### Overlay controller
- [ ] `show()` / `hide()`
- [ ] `updateRegions(regions: readonly BlurRegion[])` — send to renderer via `OVERLAY_UPDATE_REGIONS` channel
- [ ] `setSettingsMode(active: boolean)` — toggle `setIgnoreMouseEvents(!active)`, send `OVERLAY_SETTINGS_MODE` to renderer
- [ ] `destroy()`

### Settings controller
- [ ] `show()` — show and focus
- [ ] `hide()`
- [ ] `isVisible(): boolean`

**When done:** Check off tasks, set status to ✅, run tests.

---

## Phase 4 — System tray ⬜

**File:** `src/main/tray/tray.service.ts`
**Tests:** `src/main/tray/tray.service.test.ts`

- [ ] Create `Tray` with icon from `assets/icons/`
- [ ] Build dynamic context menu with:
  - "ScreenShield" header (disabled label)
  - Enable/Disable toggle (checkbox)
  - Radio group listing all profiles by name (active profile checked)
  - "New Profile..." — create blank profile, set active, open settings
  - "Edit Current..." — open settings in edit mode
  - "Quit" — `app.quit()`
- [ ] `refresh()` method — rebuild menu after any profile change
- [ ] Constructor takes: `profileService`, `onOpenSettings`, `onToggleActive`, `onSelectProfile` callbacks

**Note:** You'll need a placeholder icon file. Create a simple 16×16 PNG in `assets/icons/`.
On macOS the tray icon should be a Template image (append `Template` to filename).

**When done:** Check off tasks, set status to ✅, run tests.

---

## Phase 5 — IPC handlers ⬜

**File:** `src/main/ipc/ipc.handlers.ts`
**Tests:** `src/main/ipc/ipc.handlers.test.ts`

- [ ] `registerIpcHandlers(profileService, overlayController, settingsController, trayService)` function
- [ ] Use `ipcMain.handle()` for each channel in `ipc.channels.ts`
- [ ] Every handler validates input with Zod schemas from `profile.schema.ts`
- [ ] Every handler returns `IpcResult<T>` — never throws
- [ ] After profile mutations: send updated regions to overlay, call `trayService.refresh()`

**Tests to write:**
- Each channel is registered
- Invalid payloads rejected with descriptive error messages
- Successful operations return correct IpcResult shape
- Profile mutations trigger overlay update and tray refresh

**When done:** Check off tasks, set status to ✅, run tests.

---

## Phase 6 — Preload scripts ⬜

**Files:** `src/preload/settings.preload.ts`, `src/preload/overlay.preload.ts`
**Tests:** `src/preload/preload.test.ts`

### Settings preload
- [ ] Expose `SettingsApi` via `contextBridge.exposeInMainWorld('screenShield', { ... })`
- [ ] Each method calls `ipcRenderer.invoke(CHANNEL, data)` using channel constants
- [ ] NEVER expose raw `ipcRenderer`

### Overlay preload
- [ ] Expose `OverlayApi` via `contextBridge.exposeInMainWorld('screenShield', { ... })`
- [ ] `onRegionsUpdate` uses `ipcRenderer.on(OVERLAY_UPDATE_REGIONS, ...)`
- [ ] `onSettingsModeChange` uses `ipcRenderer.on(OVERLAY_SETTINGS_MODE, ...)`
- [ ] NEVER expose raw `ipcRenderer`

**When done:** Check off tasks, set status to ✅, run tests.

---

## Phase 7 — Overlay renderer ⬜

**Files:** `src/renderer/overlay/index.html`, `src/renderer/overlay/overlay.ts`
**Tests:** `src/renderer/overlay/overlay.test.ts`

- [ ] Minimal HTML with CSP meta tag, transparent body, `<div id="overlay-root">`
- [ ] NO React — pure TypeScript DOM manipulation
- [ ] Listen for regions via `window.screenShield.onRegionsUpdate()`
- [ ] For each region: create absolutely-positioned div with:
  - `left`/`top`/`width`/`height` using `vw`/`vh` units (from percentage coordinates)
  - `backdrop-filter: blur(Xpx)` where X = region.blurStrength
  - `background: rgba(0, 0, 0, 0.01)` — near-invisible but required for backdrop-filter
- [ ] Listen for settings mode via `window.screenShield.onSettingsModeChange()`
  - Active: show tinted overlay + visible borders around blur regions
  - Inactive: transparent pass-through
- [ ] Clear and recreate all divs on each update (region count is small)

**When done:** Check off tasks, set status to ✅, run tests.

---

## Phase 8 — Settings UI (React) ⬜

**Files:** `src/renderer/settings/index.html`, `src/renderer/settings/settings.tsx`,
`src/renderer/settings/pages/profile-list.tsx`, `src/renderer/settings/pages/region-editor.tsx`,
`src/renderer/settings/components/region-selector.tsx`, `src/renderer/settings/components/profile-card.tsx`,
`src/renderer/settings/hooks/use-profiles.ts`, `src/renderer/settings/hooks/use-region-draw.ts`
**Tests:** co-located `.test.tsx` files

- [ ] `settings.tsx` — React entry, renders profile list or region editor based on state
- [ ] `profile-list.tsx` — lists profiles, select/create/delete actions
- [ ] `region-editor.tsx` — full-screen region drawing interface
- [ ] `region-selector.tsx` — drag-to-create, click-to-select, resize handles, delete
- [ ] `profile-card.tsx` — single profile display with name, region count, actions
- [ ] `use-profiles.ts` — hook wrapping `window.screenShield` profile API calls
- [ ] `use-region-draw.ts` — hook managing mouse events for drawing/resizing regions
- [ ] All components use the `SettingsApi` type from shared types
- [ ] Use the `frontend-design` skill if available for visual quality

**When done:** Check off tasks, set status to ✅, run tests.

---

## Phase 9 — Integration wiring (index.ts) ⬜

**File:** `src/main/index.ts`

This file is pure wiring — no business logic.

- [ ] Import all modules from phases 1–6
- [ ] Create `electron-store` instance, wrap to match `ProfileStore` interface
- [ ] Create `ProfileService` with the store
- [ ] Call `initializeApp` with `onReady` callback that:
  1. Creates overlay window controller
  2. Creates settings window controller
  3. Creates TrayService with profile service and callbacks
  4. Registers IPC handlers
  5. Loads active profile regions into overlay
  6. Refreshes tray menu
- [ ] Verify the app launches with `npm start`

**When done:** Check off tasks, set status to ✅, run full suite: `npx vitest run && npx tsc --noEmit`.

---

## Phase 10 — E2E tests ⬜

**Files:** `tests/e2e/app.e2e.ts`

Using Playwright with Electron launcher:

- [ ] App launches and tray icon appears
- [ ] Creating a profile via tray menu works
- [ ] Settings window opens and closes correctly
- [ ] Drawing a region in settings mode persists across restart
- [ ] Switching profiles updates the overlay

**When done:** Check off all tasks, update status overview table, celebrate.

---

## Blocked / Known issues

> Add items here as they come up during implementation.
> Format: `[PHASE X] Description of issue — workaround if any`

(none yet)

---

## Changelog

| Date | Phase | What changed |
|------|-------|-------------|
| 2026-05-08 | 0 | Initial scaffold generated from Claude.ai conversation |
| 2026-05-17 | 1 | Application lifecycle — initializeApp with single-instance lock, event handlers, onReady |
