# ScreenShield — Agent Instructions

> This file is the **feedforward harness** for coding agents working on this project.
> It encodes architecture decisions, conventions, and constraints that increase the
> probability of correct output on the first attempt. See `docs/HARNESS.md` for the
> full harness engineering strategy.

## Project summary

ScreenShield is an Electron desktop application that renders a transparent, always-on-top
overlay allowing users to define rectangular screen regions that appear blurred during
screen shares. Users manage blur profiles via a system tray icon and a settings window.

## Technology stack — pinned versions

| Package | Version | Reason |
|---------|---------|--------|
| electron | ~40.x (latest patch) | Middle of 3 supported lines; Chromium 144, Node 24.11.1 embedded |
| Node.js (toolchain) | 22.x LTS | For dev/CI only; EOL April 2027. Electron embeds its own Node 24 |
| vite | ~7.3.x | Production-proven; Vite 8 (Rolldown) is too new for stability |
| react | ^18.3.x | Final 18.x with forward-compat warnings; React 19 has ecosystem friction |
| react-dom | ^18.3.x | Matches react |
| typescript | ~5.7.x | Pin minor to avoid cascading type breaks |
| vitest | ~4.1.x | Latest stable; requires Vite >=6, Node >=20 |
| electron-builder | ~26.8.x | Standalone packager; NOT Electron Forge |
| electron-store | ^9.x | Pure ESM; requires Electron >=30 |
| zod | ^3.24.x | IPC payload and profile schema validation |
| eslint | ^9.x | Flat config format |
| prettier | ^3.5.x | Formatting |
| playwright | ^1.52.x | E2E tests via Electron launcher |
| @testing-library/react | ^16.x | Component tests |

**Never use `latest` tags. Never introduce unlisted dependencies without updating this table.**

## Architecture decisions

### Why NOT Electron Forge
Electron Forge's Vite plugin is marked experimental since v7.5.0. We use Vite directly
for bundling and electron-builder for packaging. This separates concerns and avoids
coupling to an experimental adapter layer.

### Build pipeline
- **Vite** handles TypeScript compilation, React bundling, HMR in dev
- **electron-builder** handles packaging, installers, code signing, auto-update
- Two separate Vite configs: `vite.main.config.ts` (Node target) and `vite.renderer.config.ts` (browser target)

### Overlay architecture
- Frameless, transparent, always-on-top BrowserWindow covering full screen
- Normal mode: `setIgnoreMouseEvents(true)` — all input passes through
- Settings mode: `setIgnoreMouseEvents(false)` — interactive region selection
- Blur rendering uses CSS `backdrop-filter` or canvas, NOT React virtual DOM
- Region coordinates stored as screen-percentage (portable across resolutions)

## Feature folder structure

```
src/
├── main/                       # Electron main process
│   ├── app/                    # App lifecycle, single instance lock
│   ├── tray/                   # System tray icon, context menu
│   ├── windows/                # Window creation and orchestration
│   ├── profiles/               # Profile CRUD, persistence, validation
│   ├── ipc/                    # IPC channel constants, handlers, validation
│   └── index.ts                # Main entry point
├── renderer/
│   ├── overlay/                # Overlay window renderer (lightweight, no React)
│   ├── settings/               # Settings window (React + region editor)
│   │   ├── pages/
│   │   ├── components/
│   │   └── hooks/
│   └── shared/                 # Shared types, geometry utils
│       ├── types/
│       └── utils/
└── preload/                    # contextBridge API surface
```

Each feature folder is self-contained with its service logic, types, and co-located tests
(`*.test.ts` next to the file under test).

## Security rules — MANDATORY

These are non-negotiable. Every PR must satisfy all of them.

1. **`nodeIntegration: false`** on every BrowserWindow
2. **`contextIsolation: true`** on every BrowserWindow
3. **`sandbox: true`** on every BrowserWindow
4. All renderer↔main communication via `contextBridge.exposeInMainWorld()` in preload
5. Every IPC handler validates payloads with Zod before processing
6. IPC channel names are constants in `src/main/ipc/ipc.channels.ts` — no magic strings
7. CSP header: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`
8. Region coordinates validated as finite numbers within screen bounds before persistence
9. No `shell.openExternal()` with unvalidated URLs
10. No `remote` module usage
11. No `eval()` or `Function()` constructor
12. Preload scripts expose the minimum API surface — never expose raw `ipcRenderer`

## Coding conventions

### TypeScript
- Strict mode (`"strict": true`) in all tsconfig files
- Prefer `interface` over `type` for object shapes
- Use `readonly` on properties that should not be mutated
- Explicit return types on all exported functions
- No `any` — use `unknown` and narrow

### Naming
- Files: `kebab-case.ts` (e.g., `profile.service.ts`, `blur-canvas.ts`)
- Interfaces/types: `PascalCase` (e.g., `BlurProfile`, `BlurRegion`)
- Functions/variables: `camelCase`
- IPC channels: `SCREAMING_SNAKE_CASE` constants (e.g., `PROFILE_GET_ALL`)
- Test files: `<source-file>.test.ts` co-located with source

### Imports
- Use path aliases (`@main/`, `@renderer/`, `@shared/`) configured in tsconfig
- Group imports: node builtins → electron → external deps → internal modules
- No circular imports between feature folders

### Error handling
- Wrap IPC handlers in try/catch; return structured error objects, never throw across IPC
- Use Result pattern (`{ success: true, data } | { success: false, error }`) for IPC responses
- Log errors with context (operation name, relevant IDs)

## Testing conventions

- **Unit tests**: Vitest, co-located `*.test.ts` files
- **Component tests**: Vitest + @testing-library/react + jsdom environment
- **E2E tests**: Playwright with Electron launcher
- Test file naming: `profile.service.test.ts` (not `__tests__/` directories)
- Mock electron-store interface in unit tests; never hit filesystem
- Minimum coverage target: 80% lines for `src/main/profiles/` and `src/renderer/shared/utils/`
- Tests must pass before any commit (enforced by pre-commit hook)

## Git conventions

- Conventional commits: `feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`
- Branch naming: `feat/region-editor`, `fix/overlay-transparency`, `chore/ci-matrix`
- PRs require passing CI (lint + test) before merge
- Version tags: `v*.*.*` trigger release workflow

## CI/CD (GitHub Actions)

### ci.yml — runs on every push/PR
1. Install dependencies (npm ci)
2. Run ESLint
3. Run Vitest with coverage
4. Fail if coverage drops below threshold or lint errors exist

### release.yml — runs on `v*.*.*` tags
1. Matrix: macos-latest, windows-latest, ubuntu-latest
2. Install deps, run full test suite
3. `npm run build` (Vite compiles main + renderer)
4. `electron-builder --publish always` (creates installers, uploads to GitHub Release draft)
5. macOS: code signing + notarization via repository secrets
6. Windows: NSIS installer

## Harness engineering alignment

This project follows the harness engineering model from Birgitta Böckeler's article.
See `docs/HARNESS.md` for the complete mapping.

### Feedforward guides (steer before acting)
- This CLAUDE.md file
- `.eslintrc.cjs` with strict rules
- `tsconfig.json` with strict mode
- Zod schemas as living documentation of data contracts
- `docs/ARCHITECTURE.md` for high-level design decisions

### Feedback sensors (detect and self-correct after acting)
- ESLint (computational, pre-commit)
- TypeScript compiler (computational, pre-commit)
- Vitest unit tests (computational, pre-commit)
- Playwright E2E tests (computational, CI pipeline)
- `npm audit` (computational, CI pipeline)
- Code review (inferential, PR)

### Timing: keep quality left
- Pre-commit: lint + typecheck + fast unit tests
- CI (pre-merge): full test suite + coverage check + audit
- Release pipeline: cross-platform build + smoke test
