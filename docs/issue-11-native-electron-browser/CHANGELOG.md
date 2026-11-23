# Changelog - issue-11

## 2026-11-23

- `docs/decisions/0002-chrome-cdp-browser.md` - replaced the Electron browser-host choice with an
  installed Chrome page engine driven by CDP.
- `docs/issue-11-chrome-cdp-browser/` - added the Tier 3 design, test cases and known issues.
- `src/main/browser/chrome-launcher.ts` - added Chrome discovery, headless launch arguments,
  debugging endpoint parsing and process ownership.
- `tests/unit/chrome-launcher.test.ts` - covered Chrome discovery, launch arguments and endpoint
  parsing.
- `src/main/browser/chrome-cdp.ts` - added a CDP WebSocket client with command matching, event
  fan-out, one attached page, viewport control, screenshots, isolated-world evaluation and history.
- `tests/unit/chrome-cdp.test.ts` - covered connect, command matching, error replies, event routing
  and page creation with a fake socket.
- `src/main/browser/chrome-input.ts` - mapped renderer mouse, wheel, key and text events to CDP
  Input commands with bounds checks and a Windows virtual-key table.
- `tests/unit/chrome-input.test.ts` - covered every input type and malformed events.
- `src/main/browser/browser-view.ts` - replaced `WebContentsView` with the Chrome process, CDP
  page, JPEG frame pump and input forwarding; kept the existing navigation, capture, extract and
  state API. Downloads are denied and popups open in the single page.
- `src/main/browser/network-capture.ts` - replaced `webContents.debugger` with page CDP events and
  `Network.getResponseBody` on the Chrome page.
- `src/main/browser/page-extract.ts` - moved extraction from Electron's isolated world to a CDP
  isolated world on the Chrome page.
- `src/shared/ipc-contract.ts`, `src/preload/index.ts`, `src/main/ipc.ts` - added `browser:input`
  and `browser:frame` channels; the renderer never receives the CDP socket.
- `src/renderer/src/features/browser/BrowserProvider.tsx`, `BrowserWorkspace.tsx`, `styles.css` -
  drew JPEG frames in the viewport and forwarded pointer, wheel, key and paste events.
- `docs/_systems/browser.md`, `docs/_systems/browser-capture.md`, `docs/_systems/app-shell.md`,
  `docs/ARCHITECTURE.md` - updated the durable descriptions to the Chrome CDP architecture.
- `src/main/browser/chrome-cdp.ts` - reuses Chrome's startup `about:blank` target instead of creating
  a second page, so the app keeps one CDP page.
- `tests/unit/chrome-cdp.test.ts` - covered startup-page reuse, creation fallback and target
  filtering.
- `src/main/browser/chrome-launcher.ts` - deletes a stale `DevToolsActivePort` before launching Chrome
  so a previous session's dead port cannot break the next launch.
- `tests/unit/chrome-launcher.test.ts` - covered stale port removal.
- `src/main/browser/chrome-launcher.ts` - added `--disable-blink-features=AutomationControlled` so
  pages read `navigator.webdriver` as false.
- `src/main/browser/chrome-cdp.ts` - removes the `Headless` token from Chrome's own user agent before
  the first navigation with `Network.setUserAgentOverride`.
- `tests/unit/chrome-cdp.test.ts` - covered the user-agent override and page setup replies.
- `docs/_systems/browser.md` - recorded the browser identity flags.
- Manual test: DuckDuckGo showed its "Please try again" bot check for a `linkedin` search. With the
  two identity changes, the same search returned normal results in a standalone Chrome run.
- `src/main/browser/chrome-cdp.ts` - added a command timeout so a silent screenshot reply cannot
  leave `frameInFlight` stuck and freeze the frame pump.
- `src/main/browser/chrome-launcher.ts` - added `--disable-features=SigninInterception` after local
  testing found Chrome opening `chrome://signin-dice-web-intercept.top-chrome` during sign-in.
- Local lag measurements found screenshot calls at `88, 78, 55, 49, 68, 57, 160, 61, 49, 57` ms and
  a base64 payload of `223520` bytes. Input without screenshots measured `p50 7 ms, p95 9 ms`; input
  with screenshots measured `p50 7 ms, p95 21 ms`. A 33 ms mouse-move throttle and a 200 ms frame
  timer reduced duplicate input but left the page painting in 200 ms jumps.
- `docs/decisions/0003-chrome-overlay-window.md` - superseded the headless frame design with a
  headed Chrome app window placed over the Electron viewport.
- `src/main/browser/chrome-launcher.ts` - replaced `--headless=new` with `--app=about:blank` and set
  `windowsHide: false` so Chrome paints a visible page.
- `src/main/browser/chrome-window.ts` - added a long-lived PowerShell helper that places and hides
  the Chrome window through Win32 calls. The helper runs from a script file because PowerShell
  buffers script text sent to `-Command -`. A `PING`/`PONG` handshake gates the first `PLACE`.
- `src/main/browser/browser-view.ts` - removed the JPEG frame pump, device metrics updates and CDP
  input forwarding. Main now places the Chrome window from `browser:set-bounds` and keeps browser
  state deduplicated.
- `src/shared/ipc-contract.ts`, `src/preload/index.ts`, `src/main/ipc.ts` - removed `browser:input`
  and `browser:frame`. The renderer no longer receives page images or sends page input.
- `src/renderer/src/features/browser/BrowserProvider.tsx`, `BrowserWorkspace.tsx`, `styles.css` -
  removed frame subscription, input handlers and the `<img>` that drew frames. The viewport is now a
  placeholder that holds the Chrome window.
- Local check: the app content box and the Chrome window both reported `552,206,1048,718` in screen
  pixels after navigation to `https://www.example.com/`. No `.browser-frame` element remained in the
  renderer. Capture through the app returned `38704` PNG bytes with the source page attached.
- `src/main/browser/chrome-cdp.ts` - corrected `mainFrameId` to call `Page.getFrameTree`. The old
  `DOM.getFrameTree` command does not exist, and Extract failed with
  `The page content could not be read: 'DOM.getFrameTree' wasn't found.`.
- `tests/unit/chrome-cdp.test.ts` - covered the isolated-world frame lookup with a fake CDP socket.
- The headed overlay was rejected after local testing showed the Chrome window can be dragged away
  and that the Chrome dependency remains. The user chose the headless frame MVP instead.
- `docs/decisions/0004-headless-frames-after-pause.md` - superseded ADR 0003 and recorded the local
  MVP. ADR 0003 stays as history of the rejected overlay attempt.
- `src/main/browser/browser-view.ts` - restored headless Chrome, in-app JPEG frames and CDP input.
  Replaced the 200 ms frame timer with one frame 150 ms after input stops. Added state dedupe and a
  frame generation check so a stale screenshot is dropped.
- `src/shared/input-throttle.ts`, `tests/unit/input-throttle.test.ts` - capped mouse moves at 33 ms.
- `src/renderer/src/features/browser/BrowserWorkspace.tsx` - used the shared mouse-move limit before
  sending input to main.
- `src/main/browser/chrome-window.ts` and `tests/unit/chrome-window.test.ts` - removed from the local
  branch; the app no longer places a separate Chrome window.
- `docs/issue-11-chrome-cdp-browser/` - brought HLD, LLD, IPC contracts and known issues back to the
  headless frame design and recorded the pause-based scheduler.
- The user rejected the Chrome dependency and asked for the native Electron browser. ADR 0005
  supersedes ADR 0002, ADR 0003, and ADR 0004. The earlier ADRs stay as history.
- `src/main/browser/browser-view.ts` - restored one `WebContentsView` in the app window. Main places
  the native view over the renderer's page box and Electron paints the page directly.
- `src/main/browser/network-capture.ts`, `src/main/browser/page-extract.ts` - restored Electron's
  debugger for network recording and Electron's isolated world for page text.
- `src/main/browser/chrome-cdp.ts`, `chrome-input.ts`, `chrome-launcher.ts`, `src/shared/input-throttle.ts`
  and their tests were removed. No Chrome process, profile, frame stream, or CDP input path remains.
- `src/shared/ipc-contract.ts`, `src/preload/index.ts`, `src/main/ipc.ts`, `BrowserProvider.tsx`,
  `BrowserWorkspace.tsx` and `styles.css` - removed `browser:input` and `browser:frame`. The renderer
  no longer forwards page input or draws JPEG frames.
- `docs/issue-11-chrome-cdp-browser/` - renamed to `docs/issue-11-native-electron-browser/` and
  rewritten for the current native Electron design. HLD, LLD, IPC contracts, known issues and test
  cases now describe the native path.
- `docs/_systems/browser.md`, `docs/ARCHITECTURE.md`, `docs/_systems/app-shell.md`,
  `docs/_systems/browser-capture.md` - restored the durable Electron browser descriptions.
