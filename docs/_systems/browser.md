# Browser

Facts about the built-in browser that stay true after issue-11 closes. Main-process code lives in
`src/main/browser/`; the UI lives in `src/renderer/src/features/browser/`; the address rules live
in `src/shared/address.ts`. ADR 0002 supersedes ADR 0001's browser-host choice. ADR 0004 replaces
ADR 0002's fixed frame timer with one frame after input stops.

## How the page is shown

- The page runs in an installed Google Chrome, not in Electron. Chrome starts headless with
  `--headless=new` and a dedicated profile under the app data folder. The launcher is
  `chrome-launcher.ts`; it finds Chrome through an environment override or the standard Windows
  install paths, then reads the debugging endpoint from `DevToolsActivePort`.
- `chrome-cdp.ts` connects to that endpoint over a WebSocket from Node 22. One page target is
  created and attached with a flattened session. All page commands and events carry that session
  id. No CDP library is needed.
- `browser-view.ts` owns the Chrome process, the CDP client and the page. Chrome starts on the
  first navigation and the same page is reused after that.
- The renderer measures its `.browser-viewport` box and sends the bounds over
  `browser:set-bounds`. Main scales the box by the app page's zoom and sends
  `Emulation.setDeviceMetricsOverride` so Chrome renders at that size.
- `scheduleFrame` asks Chrome for one JPEG screenshot 150 ms after mouse, wheel, key, navigation or
  resize input stops. Main sends the base64 bytes to the renderer on `browser:frame`. The renderer
  draws the image in `.browser-viewport`. A page that is not visible gets no new frames. A later
  input replaces the pending frame, and a stale screenshot is dropped.
- Input never goes to Electron's web contents. The renderer sends `browser:input` events;
  `chrome-input.ts` maps them to CDP `Input` commands in main. Coordinates are scaled for app zoom.
  The renderer caps mouse moves at 33 ms.
- Main pushes `BrowserState` (URL, title, loading, back and forward, security, notice) to the
  renderer on `browser:state` after every navigation, load, title change or notice.

## Isolation

- The app UI stays an Electron window with `contextIsolation: true`, `sandbox: true`,
  `nodeIntegration: false` and `webviewTag: false`. The renderer gets frames and structured state
  only, never the CDP socket or Chrome's profile.
- Web pages run in a separate Chrome process with their own profile. Page scripts have no access
  to the app, the preload bridge or Node.
- Chrome runs with `--disable-blink-features=AutomationControlled`, so pages read
  `navigator.webdriver` as false. The CDP page removes the `Headless` token from Chrome's own user
  agent before the first navigation. Both changes stop sites such as DuckDuckGo from flagging the
  page as a bot. The browser remains real Chrome and the debugging port stays on loopback with no
  broad origin flag.
- Downloads are denied through `Browser.setDownloadBehavior`. Popups are closed and their address
  opened in the same page, keeping the one-page rule.

## Rules

| Event | What happens |
|---|---|
| Address bar text | `parseAddress`: full http(s) URL as typed; a bare host gets https (http for localhost, loopback, and private IPs); anything else becomes a DuckDuckGo search; other schemes are refused |
| Popup, `target="_blank"`, `window.open` | The new Chrome target is closed and its http(s) address opened in the active page; no second window |
| Download | Denied in Chrome; no file is saved |
| Failed main-frame load | Notice with the URL and Chromium's error; `ERR_ABORTED` (-3) is ignored |
| Chrome missing or start failure | Notice with a plain error message; the browser stays disabled until the next navigation retry |

Main checks every renderer input again: address text (string, at most 4096 characters), bounds
(finite numbers), and input events (finite bounded coordinates, limited text).

## Page identity and capture state

- The address field shows the security icon and host while idle and the full URL while editing.
  Below the toolbar, a strip shows a security badge (`pageSecurity`: Secure for https, Local for
  local http, Not secure otherwise), the page title, and the full URL. The sidebar footer shows
  the active host and title on every view.
- The capture state (idle, capturing or reading, added, failed) shows in the Browser view's strip
  and in the sidebar footer. See [UI design](./ui-design.md).
- While network recording runs, the Record network button turns red and reads Stop (N), the
  strip shows "Recording · N endpoints", and the sidebar footer shows a network line. After a
  session, the strip says how many endpoints wait for review in Context.

## Capture

**Capture screenshot** calls `browser:capture`. Main runs `Page.captureScreenshot` on the Chrome
page and returns PNG bytes. The renderer turns the bytes into a
`File` named `page-<host>-<YYYY-MM-DD-HHMMSS>.png`, adds the file to the screenshot list through
the same import checks, and attaches the source page (URL, title, time). See
[Screenshots](./screenshots.md) and [Context package](./context-package.md).

## Extract page text

**Extract page text** runs the extraction script in an isolated world created with CDP, then
limits and redacts the result in main. See [Page content](./page-content.md).

## Record network

**Record network** records the page's API calls (fetch and XHR) with JSON or text bodies, pruned
and redacted in main, for review in Context. See [Browser capture](./browser-capture.md).

## Limits

- One page at a time; there are no tabs.
- Capture covers the visible area only, not the full page.
- Chrome must be installed on the machine; the installer does not bundle it.
- Headless Chrome can still be rejected by anti-bot checks. See
  [issue-11 Known_Issues](../issue-11-chrome-cdp-browser/Known_Issues.md).
- No keyboard shortcuts yet (F5, Alt+Left, Ctrl+L); key presses inside the page go to the page.
