# Browser

Facts about the built-in browser that stay true after issue-6 closes. Main-process code lives in
`src/main/browser/`; the UI lives in `src/renderer/src/features/browser/`; the address rules live
in `src/shared/address.ts`. ADR 0005 supersedes ADR 0002, ADR 0003, and ADR 0004 and restores the
native page view.

## How the page is shown

- One `WebContentsView` holds the web page. Main adds it to the app window's `contentView`, on
  top of the app page. `BrowserView` is deprecated and `<webview>` is discouraged by Electron.
- The renderer measures its `.browser-viewport` box and sends the bounds over
  `browser:set-bounds` (on mount, on resize, and with `visible: false` on unmount). Main scales
  the bounds by the app page's zoom factor.
- The view is created on the first navigation and stays hidden until then, so the renderer's
  start panel shows. It is hidden while Screenshots or Context is open and keeps its page.
- Main pushes `BrowserState` (URL, title, loading, back and forward, security, notice) to the
  renderer on `browser:state` after every load, navigation, title change, or notice.
- Renderer UI cannot draw over the page area: the native view is always on top.

## Isolation

- The page view has `contextIsolation`, `sandbox`, no `nodeIntegration`, no `webviewTag`, and
  **no preload**, so web pages have no `window.bridge` and no Node.
- Pages use the session partition `persist:browser`: cookies and storage persist across launches
  and stay apart from the app UI's session.
- The user agent drops Electron's `Electron/x` and app tokens (`plainChromeUserAgent`), so sites
  see a plain Chrome user agent.

## Rules

| Event | What happens |
|---|---|
| Address bar text | `parseAddress`: full http(s) URL as typed; a bare host gets https (http for localhost, loopback, and private IPs); anything else becomes a DuckDuckGo search; other schemes are refused |
| Link or redirect to a non-http(s) scheme | Blocked in `will-navigate` and `will-redirect`, with a notice (`file:` links are already blocked by Chromium) |
| Popup, `target="_blank"`, `window.open` | Loads in the same view; no second window |
| Download | Cancelled, with a notice naming the file |
| Permission request (camera, microphone, location, notifications, open another app) | Denied; a notice for the common ones |
| Failed main-frame load | Notice with the URL and Chromium's error; `ERR_ABORTED` (-3) is ignored |
| Page crash | Notice asking the user to reload |

Main checks every renderer input again: address text (string, at most 4096 characters) and
bounds (finite numbers).

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

**Capture screenshot** calls `browser:capture`. Main runs `webContents.capturePage()` on the
visible area. Right after a load, Chromium may have no frame yet ("UnknownVizError"), so main
asks for a repaint and retries up to three times. The PNG goes back to the renderer, becomes a
`File` named `page-<host>-<YYYY-MM-DD-HHMMSS>.png`, and joins the screenshot list through the
same import checks, with its source page (URL, title, time) attached. See
[Screenshots](./screenshots.md) and [Context package](./context-package.md).

## Extract page text

**Extract page text** reads the active page's text, headings, tables, and selected text into
Context, with limits and secret redaction. See [Page content](./page-content.md).

## Record network

**Record network** records the page's API calls (fetch and XHR) with JSON or text bodies, pruned
and redacted in main, for review in Context. See [Browser capture](./browser-capture.md).

## Limits

- One page at a time; there are no tabs.
- Capture covers the visible area only, not the full page.
- No keyboard shortcuts yet (F5, Alt+Left, Ctrl+L); key presses inside the page go to the page.
- Google sign-in failed in an earlier native-view attempt and needs a real-account test. ADR 0005
  accepts that risk and adds no Chrome fallback.
- See [issue-6 Known_Issues](../issue-6-in-app-browser/Known_Issues.md) for location requests
  and other gaps.
