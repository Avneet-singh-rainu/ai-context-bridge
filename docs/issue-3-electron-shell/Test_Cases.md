# Test Cases - issue-3

**Status of this run:** passed on 2026-11-23, except TC6 (not run yet)

## TC1 - npm run dev opens the app

**Setup:** `npm install` done.

**Steps:**
1. `npm run dev`

**Expected:** an Electron window titled "AI Context Bridge" opens on the Browser view. The status
bar shows "v0.1.0 - Electron 45.4.1", which proves the preload bridge and `app:get-info` work.

---

## TC2 - Navigation switches workspaces

**Steps:**
1. Click Screenshots, then Context, then Browser.

**Expected:** the heading changes each time and the clicked item is highlighted.

---

## TC3 - npm run build completes

**Steps:**
1. `npm run build`

**Expected:** the typecheck passes and `out/main/index.js`, `out/preload/index.js`, and
`out/renderer/index.html` are written.

---

## TC4 - Quality checks pass

**Steps:**
1. `npm run check` (Biome lint, format, and import order)
2. `npm run typecheck`
3. `npm test`

**Expected:** Biome reports no errors, the typecheck passes, and 5 tests pass.

---

## TC5 - Installer builds and the packaged app runs

**Steps:**
1. `npm run dist`
2. Run `dist/win-unpacked/AI Context Bridge.exe`.

**Expected:** `dist/AI-Context-Bridge-Setup-0.1.0.exe` exists. The packaged window starts on the
Browser view and the status bar shows the version.

---

## TC6 - Install on a clean Windows machine

**Steps:**
1. Copy the installer to a Windows machine without Node.js or the repo.
2. Run the installer and open the app from the Start menu.

**Expected:** the app installs and opens. SmartScreen may warn first, because the installer is not
code-signed.

---

## TC7 - Renderer outside Electron

**Steps:**
1. While `npm run dev` runs, open `http://localhost:5173` in a normal browser.

**Expected:** the shell renders with no console errors, and the status bar shows "Preview outside
Electron" because there is no preload bridge.
