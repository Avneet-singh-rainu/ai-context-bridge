# Changelog - issue-3

## 2026-11-23

- `package.json`, `electron.vite.config.ts`, `tsconfig*.json` - electron-vite 6 and Vite 8 build
  main, preload, and renderer from the electron-vite default folders; TypeScript 7 type checks.
- `src/main/`, `src/preload/index.ts`, `src/shared/ipc-contract.ts` - main window with the spike's
  isolation settings, popup and navigation blocking, and the `app:get-info` channel.
- `src/renderer/` - React 19 shell: sidebar navigation, three placeholder workspaces, and a status
  bar that reads the app version through the preload bridge. The empty placeholder folders moved
  here from `src/app/`; `src/native/` was removed.
- `biome.json`, `vitest.config.mts`, `tests/unit/` - Biome lint and format, and Vitest 5 with 5
  unit tests, including a guard on the window isolation settings.
- `electron-builder.yml` - NSIS x64 installer written to `dist/`.
- `.gitignore` - ignores `.claude/settings.local.json` so local Claude permissions are never
  committed.
