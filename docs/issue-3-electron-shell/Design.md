# issue-3 - Scaffold Electron + React + TypeScript shell

**Systems:** [app-shell](../_systems/app-shell.md)
**Related:** [issue-1](../issue-1-stack-decision/Design.md) (stack decision),
[issue-2](../issue-2-electron-feasibility/Design.md) (capture spike)

## Context / Problem

Milestone 1 needs a desktop app that opens, builds, and packages before any feature work starts.
Acceptance: `npm run dev` opens the app and `npm run build` completes.

## Design

The process model, folder layout, isolation rules, tooling, and build commands live in
[App shell](../_systems/app-shell.md). This ticket adds:

- **Build:** electron-vite 6 on Vite 8 builds main, preload, and renderer from the electron-vite
  default folders, so the config has no custom entries. The pre-stack placeholders `src/app/` and
  `src/native/` are gone; the feature folders now live under `src/renderer/src/`.
- **UI:** React 19 shell with a sidebar (Browser, Screenshots, Context), one placeholder workspace
  per view that names its milestone, and a status bar. The active view is React state, not a
  router.
- **Bridge:** one IPC channel, `app:get-info`, shows the app version in the status bar. That
  channel proves the preload bridge works end to end. See [IPC_Contracts.md](IPC_Contracts.md).
- **Window safety:** isolation settings from the spike, popups denied, navigation away from the
  app page blocked, and a Content Security Policy that allows scripts from the app only.
- **Quality:** Biome for lint and format (React hooks rules included), TypeScript 7 for type
  checks, and Vitest 5 for unit tests.
- **Packaging:** electron-builder 26 makes an unsigned NSIS x64 installer in `dist/`.

The decisions behind these choices, and the quiz answers that changed two of them, are in
[AI_Decisions.md](AI_Decisions.md).

## Verification / Rollout

[Test_Cases.md](Test_Cases.md) lists the checks. Nothing depends on the shell yet, so backing out
means deleting the scaffold files and `package.json`.
