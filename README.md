# AI Context Bridge

A local-first Windows desktop application that collects context from screenshots, a built-in browser page, and supported network responses, then produces one editable context package that can be pasted into an AI chat.

**Status:** pre-development. The MVP stack is Electron + React + TypeScript, recorded in [ADR 0001](./docs/decisions/0001-stack-selection.md). The product brief, scope, constraints, and implementation plan live in [AI_Context_Bridge_Codex_Handoff.md](./AI_Context_Bridge_Codex_Handoff.md).

Task tracking uses the free [GitHub Projects kanban board](https://github.com/users/Avneet-singh-rainu/projects/4).

## Repository layout

```text
docs/                  Product, architecture, privacy, and development documentation
  decisions/           Architecture decision records
src/app/               React + TypeScript UI and application orchestration
  components/          Shared UI components
  features/            Browser, capture, screenshots, context, and export features
  services/            Application services
  types/               Shared TypeScript types
src/native/            Planned Electron main and preload processes
tests/                 Unit and integration tests
.github/workflows/     CI workflows
```

## Current stage

Milestone 0 is in progress. The stack decision is made; framework scaffolding is next. See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the checks still to run.
