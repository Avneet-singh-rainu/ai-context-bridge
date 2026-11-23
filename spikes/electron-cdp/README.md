# Electron CDP feasibility spike

This is a throwaway prototype for issue #2, not application code.

It starts a tiny local HTTP server, opens a visible `BrowserWindow`, attaches `webContents.debugger`, enables the CDP `Network` domain, fetches a JSON file from the page, extracts visible DOM text, and writes `results.json`.

## Run

From this folder:

```powershell
npm install
npm start
```

## Debug in VS Code

Open the repository root in VS Code, open `main.js`, set a breakpoint, then press F5 with the **Electron CDP Spike: Main** configuration selected.

The config lives in `.vscode/launch.json` at the repository root. It runs `electron .` from this folder and captures stdout and stderr in the VS Code Debug Console. Run `npm install` in this folder first, because the config starts Electron from `node_modules`.

The spike pins Electron `45.4.1`, the version that produced `results.json`.

Do not open Electron DevTools on the same window while debugging this spike. Opening DevTools detaches `webContents.debugger` and stops CDP capture.

The browser window opens visibly for about 8 seconds after the page loads. `results.json` is written in this folder when the window closes. The watchdog closes everything after 25 seconds if navigation fails.

## Observed result

The run recorded in `results.json` succeeded with `reason: "load"`.

- 4 CDP events: two requests and two responses.
- 1 JSON response body captured with `Network.getResponseBody`.
- 2 `session.webRequest` entries with status codes and response headers.
- DOM title, heading, and fetched result text extracted.
- Isolation probe returned `undefined` for require, process, module and window.electronAPI.
- No `cdpErrors`.

## Important gotcha

Do not await `debugger.sendCommand('Network.enable')` without a timeout before navigation. The promise may not resolve until the target navigates. The spike sends the command, then waits at most one second with `Promise.race` before `loadURL()`.

Call `Network.getResponseBody` after `Network.loadingFinished`. Calling it on `Network.responseReceived` can fail with "No resource with given identifier found".

## What this proves

- Electron can attach the Chrome DevTools Protocol debugger to a normal `BrowserWindow`.
- `Network.enable` delivers `Network.requestWillBeSent` and `Network.responseReceived`.
- `Network.getResponseBody` returns a permitted JSON response body.
- `session.webRequest.onCompleted` gives status code, MIME type, and response headers.
- `webContents.executeJavaScript` extracts active-page DOM text.
- Browser content stays isolated from the app UI with `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`. The page-world probe records Node globals as `undefined`.

See [Browser capture](../../docs/_systems/browser-capture.md) for the shared capture facts and limits.
