# Browser capture

Facts about recording the browser view's network traffic that stay true after issue-8 closes. The
recorder is `src/main/browser/network-capture.ts`, the merge step is `network-store.ts` in the
same folder, and the shared types, filters, limits, and pruning are in `src/shared/network.ts`.
The Electron CDP spike in `spikes/electron-cdp/` first proved the path.

## Capture path

- The recorder uses the Chrome DevTools Protocol (CDP, Chrome's event and command interface) on
  the browser view's `webContents` (see [Browser](./browser.md)).
- `webContents.debugger.attach('1.3')` runs only when the user clicks **Record network**, and the
  debugger is detached when the session ends. Nothing is observed outside a session.
- `Network.enable` starts the CDP Network domain with `maxResourceBufferSize` (1 MB plus 64 KB)
  and `maxTotalBufferSize` (32 MB), so Chromium does not hold huge bodies. The command can wait
  until the page does something, so the recorder waits at most one second for it.
- `Network.requestWillBeSent` gives the method, URL, and request type; `Network.responseReceived`
  gives the status and MIME type; after `Network.loadingFinished` for the same request,
  `Network.getResponseBody` returns the body. Calling it earlier can fail with "No resource with
  given identifier found".
- `Network.loadingFailed` for an API request counts as failed; nothing else is stored.

## Session rules

- A session starts on Record network and ends on Stop, on navigation to another origin, or when
  the debugger detaches. The page is not reloaded automatically; a notice offers Reload.
- Kept entries outlive the session. A later session merges into them; Clear all removes them.
- State goes to the renderer on the `network:state` event, throttled to one push every 300 ms
  while responses arrive ([issue-8 IPC contracts](../issue-8-network-capture/IPC_Contracts.md)).

## What is kept

- Requests of type XHR, Fetch, or Other (`isApiResource`) with a JSON or text body
  (`responseKind`: `application/json`, any `+json`, `text/plain`, `text/csv`). Everything else
  only raises the ignored count.
- Never stored: request bodies, request and response headers, cookies, query values. Query key
  names are kept.
- One entry per method and endpoint (origin and path). A new call raises the call count and
  replaces the body with the newest one.
- Bodies over 1 MB (by encoded length, or after reading) keep their details and a note only.
- `reduceBody` prunes JSON by structure (`pruneJson`: 3 array items, 50 object keys,
  200-character strings, depth 6, base64 runs and data URLs removed), runs a tighter second pass
  if needed, and caps the text at 8,000 characters at a line break. `redactSecrets` runs on the
  result in main, before the renderer gets it.
- At most 200 entries; later new endpoints raise the skipped count.

## Isolation

- The browser view has `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`,
  and no preload. The spike probe found `require`, `process`, `module`, and `window.electronAPI`
  all `undefined` in the page world.
- Opening Chromium DevTools on the browser view detaches `webContents.debugger` and ends the
  session. The app's code has no command that opens DevTools on the view.

## Limits

- Only the active browser view is observed. Other windows and tabs are out of scope.
- WebSocket messages and server-sent event streams are not recorded. A body Chromium cannot
  return keeps its details with a note instead of invented content.
- Calls merge only on an exact path, so ids in the path make separate entries
  ([issue-8 Known Issues](../issue-8-network-capture/Known_Issues.md)).
