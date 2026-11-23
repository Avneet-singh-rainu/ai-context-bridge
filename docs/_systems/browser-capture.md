# Browser capture

Facts that stay true after issue-2 closes. The Electron CDP spike in `spikes/electron-cdp/` proves each point.

## Capture path

- The spike used a normal `BrowserWindow`. The app's built-in browser is a `WebContentsView`
  inside the app window (see [Browser](./browser.md)); the CDP steps below apply to that view's
  `webContents` the same way.
- `webContents.debugger.attach('1.3')` opens the Chrome DevTools Protocol (CDP) channel. CDP is Chrome's event and command interface.
- `Network.enable` starts the CDP Network domain. Send the command before navigation and wait at most one second for the promise. An unbounded `await` before navigation can hang, so the spike uses a bounded race.
- `Network.requestWillBeSent` records request ID, URL, method and request type.
- `Network.responseReceived` records status and MIME type. Call `Network.getResponseBody` after `Network.loadingFinished` for the same request. Calling on `responseReceived` can fail with "No resource with given identifier found".
- `session.webRequest.onCompleted` records status code, MIME type and response headers. `webRequest` gives metadata; CDP gives the response body text.
- `webContents.executeJavaScript` reads the active page DOM from the page world.

## Isolation

Set `nodeIntegration: false`, `contextIsolation: true` and `sandbox: true` on `webPreferences`. The spike probe reads `typeof require`, `typeof process`, `typeof module` and `typeof window.electronAPI` from the page world. All four values are `undefined`.

Do not open Chromium DevTools on the captured window. DevTools detaches `webContents.debugger` and stops CDP capture. VS Code debugs the main process instead.

## Limits

- Only the active `BrowserWindow` is observed. Other windows and tabs are out of scope.
- Response bodies are not always available. Streaming, binary, opaque, cached or blocked responses can fail. Record the error instead of inventing content.
- Redirects, service workers and cross-origin responses need more filtering than the local same-origin test.
- WebSocket frames are not captured by the Network domain path used in the spike.
- No secret redaction exists in the spike. The production provider must redact cookies, authorization headers, tokens and keys before persistence.
- Strict size and count limits are out of scope for the spike and belong in the M6 provider.
