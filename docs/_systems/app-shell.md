# App shell

Facts about the Electron app structure that stay true after issue-3 closes.

## Processes and folders

The layout is the electron-vite default, so `electron.vite.config.ts` needs no custom entries.

| Part | Folder | Runs as | Can use |
|---|---|---|---|
| Main process | `src/main/` | Node, trusted | Electron and Node APIs, files, IPC handlers |
| Preload bridge | `src/preload/` | Sandboxed script | `contextBridge` and `ipcRenderer` only |
| Renderer (UI) | `src/renderer/` (`index.html` + `src/`) | React in Chromium | `window.bridge` only; no Node |
| IPC contract | `src/shared/ipc-contract.ts` | Shared module | Channel names and types used by all three |

electron-vite builds each part into `out/main/`, `out/preload/`, and `out/renderer/`.

## Rules

- The main window keeps `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, and
  `webviewTag: false`. `tests/unit/window-options.test.ts` fails if any of these change.
- A new IPC channel needs three edits: the name and types in `src/shared/ipc-contract.ts`, a
  handler in `src/main/ipc.ts`, and a method in `src/preload/index.ts`. The ticket also adds an
  `IPC_Contracts.md` entry.
- The app window denies new windows and blocks navigation away from its own page.
- `src/renderer/index.html` sets a Content Security Policy that allows scripts from the app only.
  Images may come from the app or `data:` URLs; `fetch` and other connections fall back to
  `default-src 'self'`.
- `src/renderer/src/main.tsx` refuses file drops outside a drop zone, so a dropped file never
  replaces the app page. A drop zone calls `preventDefault` on `dragover` and `drop` itself.
- The renderer must still render without `window.bridge`, so the UI can be previewed in a normal
  browser during `npm run dev`.
- `package.json` has no `"type": "module"`, so main and preload build as CommonJS. Sandboxed
  preload scripts cannot be ES modules.

## Tooling

- Biome lints and formats; `biome.json` holds the rules (React domain on, 2 spaces, single
  quotes, 100 columns). Docs, spikes, and Markdown are excluded.
- TypeScript 7 type-checks main, preload, shared, and tests through `tsconfig.node.json`, and the
  renderer through `tsconfig.web.json`. Vite does the actual compiling.
- Vitest runs `tests/**/*.test.ts` in a Node environment.

## Build and package

- `npm run build` type-checks, then writes `out/`.
- `npm run dist` builds, then electron-builder writes `dist/AI-Context-Bridge-Setup-<version>.exe`
  (NSIS, x64, unsigned, default icon).

## Versions

- Electron 45.4.1, the same version the capture spike proved.
