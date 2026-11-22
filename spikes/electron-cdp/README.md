# Electron CDP feasibility spike

This is a throwaway prototype for issue #2, not application code.

It starts a tiny local HTTP server, opens a hidden `BrowserWindow`, attaches `webContents.debugger`, enables the CDP `Network` domain, fetches a JSON file from the page, extracts visible DOM text, and writes `results.json`.

## Run

From this folder:

```powershell
npm install
npm start
```

## Debug in VS Code

Open the repository root in VS Code, open `main.js`, set a breakpoint, then press F5 with the **Electron CDP Spike: Main** configuration selected.

The config lives in `.vscode/launch.json` at the repository root. It runs `electron .` from this folder and captures stdout and stderr in the VS Code Debug Console.

Do not open Electron DevTools on the same window while debugging this spike. Opening DevTools detaches `webContents.debugger` and stops CDP capture.

The browser window opens visibly for about 8 seconds after the page loads. `results.json` is written in this folder when the window closes. The watchdog closes everything after 25 seconds if navigation fails.

## Observed result

The run recorded in `results.json` succeeded with `reason: "load"`.

- 4 CDP events: two requests and two responses.
- 1 JSON response body captured with `Network.getResponseBody`.
- 2 `session.webRequest` entries with status codes and response headers.
- DOM title, heading, and fetched result text extracted.
- No `cdpErrors`.

## Important gotcha

Do not await `debugger.sendCommand('Network.enable')` before navigation. Electron's docs note that the promise may not resolve until the target navigates. Send the command, then load the page. An early `await` hangs and no network events arrive.

## What this proves

- Electron can attach the Chrome DevTools Protocol debugger to a normal `BrowserWindow`.
- `Network.enable` delivers `Network.requestWillBeSent` and `Network.responseReceived`.
- `Network.getResponseBody` returns a permitted JSON response body.
- `session.webRequest.onCompleted` gives status code, MIME type, and response headers.
- `webContents.executeJavaScript` extracts active-page DOM text.
- Browser content stays isolated from the renderer with `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`.

## Known limits

- Response bodies are not always available. Streaming, binary, opaque, cached, or blocked responses can fail. The prototype records `cdpErrors` instead of inventing content.
- `Network.getResponseBody` must be called after `Network.responseReceived` and before the request is cleaned up. Late calls can fail.
- Only the active `BrowserWindow` is observed. Other windows and tabs are out of scope.
- The prototype captures only same-origin local test traffic. Real sites may use service workers, redirects, WebSocket, or cross-origin responses that need more filtering.
- No secret redaction is implemented here. The production provider must redact cookies, authorization headers, tokens, and keys before persistence.
- A hidden window is used for the spike. The product needs a visible browser with navigation controls.
- Installing `electron` is a development dependency only. The final application will be packaged with `electron-builder`.
