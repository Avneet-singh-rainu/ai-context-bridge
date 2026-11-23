# Development

## Requirements

- Windows 10 or 11
- Node.js 22.12 or newer, with npm (electron-vite and Vite need `^20.19` or `>=22.12`)
- For Windows OCR: Windows PowerShell 5.1 (`powershell.exe`, part of Windows) and at least one
  Windows OCR language, such as English. Without them the app falls back to Tesseract. See
  [OCR](./_systems/ocr.md).

## First setup

```powershell
npm install
npm run dev
```

If `npm run dev` fails with "Electron uninstall", Electron's download step did not run during
`npm install`. Run `node node_modules/electron/install.js` once, then start again.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server and opens the app with hot reload |
| `npm run build` | Type-checks, then builds main, preload, and renderer into `out/` |
| `npm run preview` | Runs the built app from `out/` |
| `npm run check` | Runs Biome lint, format, and import-order checks (use before a commit) |
| `npm run check:fix` | Applies Biome's safe fixes |
| `npm run lint` / `npm run format` | Runs only the Biome linter, or only the formatter (writes files) |
| `npm run typecheck` | Type-checks with TypeScript 7 |
| `npm test` | Runs the Vitest unit tests in `tests/` |
| `npm run dist` | Builds, then writes the NSIS installer to `dist/` |

## Where code lives

[App shell](./_systems/app-shell.md) describes the main process, preload bridge, renderer, and
the IPC rules.

## Debugging

- **Renderer:** while `npm run dev` runs, open `http://localhost:5173` in a normal browser. The
  status bar shows "Preview outside Electron" because there is no preload bridge.
- **Capture spike:** see the [spike README](../spikes/electron-cdp/README.md) and its VS Code
  launch config.

## Task docs

After changing any `ticket.yaml`, run `node scripts/build-task-index.mjs` to rebuild the task table
in `docs/README.md`.
