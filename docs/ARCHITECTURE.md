# Architecture

**Status:** Electron + React + TypeScript selected for the Windows MVP. The Milestone 0 spike is still pending.

The handoff proposed Tauri 2 with a separate WebView2 browser control, but flagged that approach as a critical risk. The evidence and decision are recorded in [ADR 0001](./decisions/0001-stack-selection.md).

Electron owns the desktop shell and the built-in browser. React + TypeScript render the UI. Screenshot OCR, browser capture, and export stay behind provider interfaces so each part can be replaced.

## Milestone 0 checks still to run

1. Attach `webContents.debugger` and confirm CDP `Network.requestWillBeSent`, `Network.responseReceived`, and `Network.getResponseBody`.
2. Confirm `session.webRequest` gives status, MIME type, and headers.
3. Confirm DOM extraction from the active page.
4. Confirm browser content stays isolated from the app UI.
5. Confirm `electron-builder` produces a working Windows NSIS installer.
