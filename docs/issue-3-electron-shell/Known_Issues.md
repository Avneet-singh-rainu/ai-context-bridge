# Known Issues - issue-3

## 1. Electron's download step did not run during the first npm install

**Status:** Accepted gap - workaround documented

**Found:** 2026-11-23

**What happens:** after the first `npm install`, `node_modules/electron/dist/` and `path.txt` were
missing, and `npm run dev` failed with "Electron uninstall".

**Why it was not fixed here:** running `node node_modules/electron/install.js` by hand downloaded
Electron with no error, so the root cause was not found. The workaround is in
`docs/DEVELOPMENT.md`.

**Blast radius:** developers on a fresh clone; the installer is not affected.

## 2. Installer is unsigned and uses the default Electron icon

**Status:** Accepted gap - pending Milestone 8

**Found:** 2026-11-23

**What happens:** Windows SmartScreen may warn when the installer runs. electron-builder also
warns that `author` is missing from `package.json`.

**Why it was not fixed here:** code signing, the app icon, and publisher details belong to the
public packaging milestone.

**Blast radius:** anyone who runs the installer.

## 3. npm audit reports 6 moderate issues in build tooling

**Status:** Accepted gap

**Found:** 2026-11-23

**What happens:** `npm audit` flags `minimatch` inside electron-builder's dependencies.
`npm audit --omit=dev` finds 0 issues in what the app ships.

**Why it was not fixed here:** the suggested fix is `npm audit fix --force`, which installs
breaking versions of electron-builder.

**Blast radius:** the local build machine only.

## 4. Dev console shows a CSP error when the dev server restarts

**Status:** Accepted by design

**Found:** 2026-11-23

**What happens:** after "[vite] server connection lost", the dev console logs "Creating a worker
from 'blob:...' violates ... script-src 'self'". Vite's dev client tries a blob worker to poll for
the restarted server; the CSP blocks the worker and the client still reconnects without it.

**Why it was not fixed here:** allowing `blob:` workers would loosen the production CSP for a
dev-only message. A fresh load of the dev server shows no error.

**Blast radius:** the dev console only; built and packaged apps are not affected.
