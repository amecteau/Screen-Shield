# Harness Engineering Strategy

> This document maps ScreenShield's quality controls to the harness engineering
> mental model described in Birgitta Böckeler's article (Thoughtworks, April 2026).
> The goal: increase probability of correct agent output, provide self-correction
> loops, and reduce human review toil.

## Core concepts

**Agent = Model + Harness.** The outer harness we build consists of:

- **Guides (feedforward)** — steer the agent *before* it acts
- **Sensors (feedback)** — observe *after* the agent acts and enable self-correction

Each control is either **computational** (deterministic, fast, CPU-driven) or
**inferential** (semantic, probabilistic, LLM-driven).

## Feedforward guides

### Computational guides

| Guide | What it does | Location |
|-------|-------------|----------|
| TypeScript strict mode | Prevents type errors at compile time | `tsconfig.json` |
| ESLint flat config | Enforces code style and catches bugs statically | `eslint.config.mjs` |
| Prettier | Deterministic formatting — no style debates | `.prettierrc` |
| Path aliases | Prevents import spaghetti between feature folders | `tsconfig.json` |
| Zod schemas | Living documentation of data contracts | `src/main/profiles/profile.schema.ts` |
| CSP headers | Restricts renderer capabilities at the browser level | `src/main/windows/*.ts` |

### Inferential guides

| Guide | What it does | Location |
|-------|-------------|----------|
| CLAUDE.md | Primary feedforward for coding agents — architecture, conventions, security | Project root |
| docs/ARCHITECTURE.md | High-level design decisions and rationale | `docs/` |
| This file (HARNESS.md) | Meta-guide explaining the harness itself | `docs/` |
| Feature folder README | Per-feature context for agents working in that area | Each feature folder |

## Feedback sensors

### Computational sensors (run on every change)

| Sensor | Timing | What it checks |
|--------|--------|----------------|
| TypeScript compiler | Pre-commit | Type correctness |
| ESLint | Pre-commit | Code style, import rules, security patterns |
| Vitest (fast suite) | Pre-commit | Unit test regression |
| Vitest (full suite) | CI pipeline | Full coverage including component tests |
| Playwright E2E | CI pipeline | Overlay behavior, tray interactions |
| `npm audit` | CI pipeline | Known vulnerabilities in dependencies |
| Coverage threshold | CI pipeline | Minimum 80% lines in critical paths |

### Inferential sensors (run selectively)

| Sensor | Timing | What it checks |
|--------|--------|----------------|
| Code review (human) | PR review | Semantic correctness, architecture alignment |
| Agent self-review | On demand | Ask Claude Code to review its own diff against CLAUDE.md |

## Timing: keep quality left

```
                Pre-commit          CI Pipeline           Release
                ──────────          ───────────           ───────
Feedforward:    CLAUDE.md           (inherited)           (inherited)
                ESLint config       (inherited)           (inherited)
                TSConfig strict     (inherited)           (inherited)

Feedback:       TypeScript          TypeScript            Cross-platform build
                ESLint              ESLint                Installer smoke test
                Vitest (fast)       Vitest (full)         Code signing verification
                                    Coverage check
                                    npm audit
                                    Playwright E2E
```

The principle: find issues as far left as possible. Pre-commit catches 80% of
problems instantly. CI catches integration issues. Release catches platform-specific
packaging problems.

## Regulation categories

### Maintainability harness
Most controls above regulate internal code quality. TypeScript strict mode,
ESLint, co-located tests, and feature folder structure keep the codebase
navigable and refactorable.

### Architecture fitness harness
- Feature folder boundaries enforced by import rules (no cross-feature imports
  except through `shared/`)
- Security rules in CLAUDE.md act as architecture fitness functions — every
  window must satisfy the security checklist
- Performance: overlay renderer avoids React to minimize DOM diffing overhead

### Behaviour harness
- Zod schemas define the profile data contract — if a profile doesn't validate,
  it doesn't persist
- E2E tests verify the core user flow: tray → settings → draw region → save → verify overlay
- Manual testing remains necessary for visual blur quality and screen-share
  verification (not yet automatable)

## Harnessability

This project was designed from the start for harnessability:

- **Strongly typed** (TypeScript strict) — type checker is a free sensor
- **Clear module boundaries** (feature folders) — affords import rules
- **Declarative data contracts** (Zod) — affords validation sensors
- **Separated concerns** (Vite for bundling, electron-builder for packaging) —
  each can be tested and upgraded independently

## The steering loop

When an agent-generated change causes a recurring issue:

1. Identify the pattern (e.g., "agent keeps using `ipcRenderer.send` directly")
2. Add a feedforward guide (add ESLint rule banning direct ipcRenderer usage)
3. Add a feedback sensor (add test asserting all IPC goes through preload)
4. Update CLAUDE.md with explicit instruction
5. The issue becomes structurally prevented, not just reviewed away

This is the cybernetic governor loop: observe → guide → sense → correct.
