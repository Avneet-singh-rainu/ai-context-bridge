# AI Context Bridge

A local-first Windows desktop application that collects context from screenshots, a built-in browser page, and supported network responses, then produces one editable context package that can be pasted into an AI chat.

**Status:** pre-development / planning. The product brief, scope, constraints, and implementation plan live in [AI_Context_Bridge_Codex_Handoff.md](./AI_Context_Bridge_Codex_Handoff.md).

## Repository layout

```text
docs/                  Product, architecture, privacy, and development documentation
  decisions/           Architecture decision records
src/app/               React + TypeScript UI and application orchestration
  components/          Shared UI components
  features/            Browser, capture, screenshots, context, and export features
  services/            Application services
  types/               Shared TypeScript types
src/native/            Native module (final location depends on the selected stack)
tests/                 Unit and integration tests
.github/workflows/     CI workflows
```

## Current stage

Milestone 0 (technical feasibility spike) has not been completed yet. The desktop stack has not been selected, so no framework-specific scaffolding has been added. See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the current state of that decision.
