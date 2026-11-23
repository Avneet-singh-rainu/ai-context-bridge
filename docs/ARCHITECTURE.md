# Architecture

**Status:** Electron + React + TypeScript selected for the Windows MVP. All five Milestone 0 checks have passed.

The handoff proposed Tauri 2 with a separate WebView2 browser control, but flagged that approach as a critical risk. The evidence and decision are recorded in [ADR 0001](./decisions/0001-stack-selection.md).

Electron owns the desktop shell and the built-in browser. React + TypeScript render the UI. Screenshot OCR, browser capture, and export stay behind provider interfaces so each part can be replaced.

## Milestone 0 checks

| # | Check | Result |
|---|---|---|
| 1 | Attach `webContents.debugger` and confirm CDP `Network.requestWillBeSent`, `Network.responseReceived`, and `Network.getResponseBody`. | Passed |
| 2 | Confirm `session.webRequest` gives status, MIME type, and headers. | Passed |
| 3 | Confirm DOM extraction from the active page. | Passed |
| 4 | Confirm browser content stays isolated from the app UI. | Passed |
| 5 | Confirm `electron-builder` produces a working Windows NSIS installer. | Passed (unsigned; clean-machine install not run) |

The [Electron CDP spike](../spikes/electron-cdp/README.md) proves checks 1-4. The capture path, isolation settings, and capture limits live in [Browser capture](./_systems/browser-capture.md). Issue-3 proves check 5, and the app's process model and folder layout live in [App shell](./_systems/app-shell.md).
