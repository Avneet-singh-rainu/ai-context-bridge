# issue-11 - Low-Level Design

**High-level design:** [HLD.md](HLD.md)

## Files Touched

| File | Change |
|------|--------|
| `src/main/browser/chrome-launcher.ts` | Find Chrome, launch headless with a persistent profile, read the debugging port, own process lifetime |
| `src/main/browser/chrome-cdp.ts` | Own the CDP socket, page target, domains, screenshots and isolated-world evaluation |
| `src/main/browser/chrome-input.ts` | Map mouse, wheel, key and text events to CDP Input commands |
| `src/main/browser/browser-view.ts` | Replace `WebContentsView` with the Chrome page engine; schedule one JPEG frame after input pauses and own page events |
| `src/main/browser/network-capture.ts` | Record network through page CDP events instead of `webContents.debugger` |
| `src/main/browser/page-extract.ts` | Evaluate the extraction script in a CDP isolated world |
| `src/shared/ipc-contract.ts` | Add frame and input messages to the browser contract |
| `src/preload/index.ts`, `src/main/ipc.ts` | Expose and handle the new channels |
| `src/renderer/src/features/browser/BrowserProvider.tsx`, `BrowserWorkspace.tsx` | Subscribe to frames, draw them in an `<img>`, and forward input |
| `tests/unit/chrome-launcher.test.ts` | Cover Chrome discovery, launch arguments and port parsing |
| `tests/unit/chrome-cdp.test.ts` | Cover the CDP client with a fake socket |
| `tests/unit/chrome-input.test.ts` | Cover mapping of renderer events to CDP commands |
| `tests/unit/input-throttle.test.ts` | Cover the 33 ms mouse-move limit |

## Process Boundaries & IPC

- Chrome and the CDP socket live in the main process. No preload or renderer code sees the socket.
- New renderer-to-main message: `browser:input`.
- New main-to-renderer message: `browser:frame`.
- Existing `browser:navigate`, `browser:command`, `browser:set-bounds`, `browser:get-state`,
  `browser:capture` and `browser:extract` keep their names but change implementation.
- The app window keeps `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` and
  `webviewTag: false`.
- See [IPC_Contracts.md](IPC_Contracts.md) for the two new channels.

## Data Model & Validation

- `ChromeLaunchOptions` holds the profile directory, debug port request and launch flags.
- `DevToolsEndpoint` holds the port and browser WebSocket path read from `DevToolsActivePort`.
- `BrowserFrame` holds JPEG bytes, width, height and a sequence number.
- `BrowserInput` is a tagged union for mouse move, mouse button, wheel, key and text.
- Every message from the renderer is checked for type and bounds before use. Every CDP payload is
  treated as untrusted input, the same as page DOM and network data today.

## Logic

- **Find Chrome.** Honour an explicit executable path setting first, then standard Windows install
  locations. A missing Chrome returns a clear status message.
- **Start Chrome.** Launch with `--headless=new`, `--remote-debugging-port=0`, a dedicated user
  data directory under the app data folder, and a fresh profile lock. Delete a stale
  `DevToolsActivePort` before launch. Keep the sign-in and bot-check flags from the earlier fixes.
- **Read the endpoint.** Poll `DevToolsActivePort` in the profile directory until Chrome writes a
  valid port, with a timeout. Parse the port and the browser socket path.
- **Attach the page.** Connect to the browser endpoint, create one target, attach to it with CDP
  flatten sessions, then enable `Page`, `Runtime` and `Network`.
- **Schedule one frame.** Set device metrics to the viewport size. After mouse, wheel, key,
  navigation or resize input stops for 150 ms, request one JPEG screenshot and send it to the
  renderer with a sequence number. A later input event replaces the pending frame. Drop a stale
  frame if input arrived while the screenshot was in flight.
- **Forward input.** Map renderer mouse, wheel, key and text events to CDP Input commands. Keep
  modifier state and focus in the main process. The renderer caps mouse moves at 33 ms.
- **Navigate.** Use `Page.navigate` for address changes. Treat HTTP and HTTPS the same as today:
  bare hosts get https, local hosts can use http, other text becomes a search, other schemes are
  refused. History commands use CDP navigation history.
- **Extract the page.** Evaluate the extraction script in an isolated world through CDP, then
  validate, limit and redact the result in main before sending it to Context.
- **Capture network.** Use CDP Network events on the page session. Record bodies after
  `Network.loadingFinished`. Keep headers, cookies and request bodies out of stored data.
- **Capture screenshot.** Use `Page.captureScreenshot` for the visible area and pass bytes through
  the existing screenshot import checks.
- **Stop Chrome.** Kill the Chrome process on app close. Keep the profile directory for the next
  launch.

## Privacy & Redaction

- CDP listens on loopback only. The app never opens the debugging port to the network.
- Cookies, storage and sign-in state stay inside the Chrome profile under app data.
- Response bodies are pruned and redacted in main before the renderer or Context sees them.
- No cookies, authorization headers, request bodies, tokens or keys are persisted by the app.
- Query values are dropped; query key names may be kept, matching issue 8.

## Edge Cases & Error Handling

- Chrome missing: show an install prompt and keep the browser workspace disabled.
- `DevToolsActivePort` timeout: stop Chrome and show a generic start failure notice.
- Chrome exits while capture runs: report a page stopped notice and clear the active page.
- Frame capture fails: keep the last frame. The next input or navigation asks for a new frame.
  Never show an exception message.
- Headless sign-in rejected: show the documented notice. ADR 0004 keeps one headless engine and does
  not add a headed fallback.
- Resize or zoom: update device metrics and schedule one frame after input stops; stale frames are
  dropped.
- Popups and new windows: open in the same target, matching today's one-page rule.

## Verification / Rollout

- Run the cases in [Test_Cases.md](Test_Cases.md) on a Windows machine with Chrome installed.
- The Electron browser is not kept as a switch: ADR 0002 replaces it. Roll back by reverting this
  ticket's commits. The context package format and shared redaction rules stay the same.
