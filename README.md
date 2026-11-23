# AI Context Bridge

A local-first Windows desktop application that collects context from screenshots, a built-in browser page, and supported network responses, then produces one editable context package that can be pasted into an AI chat.

**Status:** early development. The MVP stack is Electron + React + TypeScript, recorded in [ADR 0001](./docs/decisions/0001-stack-selection.md). The product brief, scope, constraints, and implementation plan live in [AI_Context_Bridge_Codex_Handoff.md](./AI_Context_Bridge_Codex_Handoff.md).

Task tracking uses the free [GitHub Projects kanban board](https://github.com/users/Avneet-singh-rainu/projects/4).

## Repository layout

```text
docs/                  Product, architecture, privacy, and development documentation
  decisions/           Architecture decision records
scripts/               Repository maintenance scripts, such as the docs task-index builder
spikes/                Throwaway feasibility prototypes, not application code
src/main/              Electron main process: window and IPC handlers
src/preload/           Preload bridge, exposed to the UI as window.bridge
src/renderer/          React + TypeScript UI: index.html and src/
  src/components/      Shared UI components
  src/features/        Browser, capture, screenshots, context, and export features
  src/services/        Application services
  src/types/           Shared TypeScript types
src/shared/            IPC contract used by main, preload, and renderer
tests/                 Unit and integration tests
.github/workflows/     CI workflows
```

## Current stage

Milestone 0 is done: ADR 0001 picks the stack, the [Electron CDP spike](./spikes/electron-cdp/README.md) proves the capture path, and issue-3 built the first NSIS installer. Milestone 1, the desktop shell, is in progress in issue-3: the app opens with `npm run dev` and builds with `npm run build`. Milestone 2, screenshot import, is in progress in issue-4. See [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for setup and [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the check list.
