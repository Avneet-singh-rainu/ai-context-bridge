# Browser

Facts about the built-in browser that stay true after issue-6 closes. Main-process code lives in
`src/main/browser/`; the UI lives in `src/renderer/src/features/browser/`; the address rules live
in `src/shared/address.ts`. ADR 0005 restores the native page view. ADR 0006 keeps that page surface
and replaces the single-page rule with tabs. ADR 0009 restores the Option A unified bar after the
four-zone attempt.

## How the page is shown

- Each open tab owns one `WebContentsView`. Main adds the view to the app window's `contentView`,
  on top of the app page, and shows only the active tab's view. `BrowserView` is deprecated and
  `<webview>` is discouraged by Electron.
- The renderer measures its `.browser-viewport` box and sends the bounds over
  `browser:set-bounds` (on mount, on resize, and with `visible: false` on unmount). Main scales
  the bounds by the app page's zoom factor and applies them to the active view.
- A view is created on the tab's first navigation. An empty tab has no view, so the renderer's
  start panel shows. All views hide while Screenshots or Context is open and keep their pages.
- Main pushes `BrowserState` (tab list, active tab id, active URL, title, loading, back and
  forward, security, notice, authRequired) on `browser:state`. Main sends the state only when a
  value changed.
- Renderer UI cannot draw over the page area while the active native view is visible. The one
  exception is the HTTP credential form: main hides the active view while the form is open, then
  shows the view again after the answer.

## Isolation

- The page view has `contextIsolation`, `sandbox`, no `nodeIntegration`, no `webviewTag`, and
  **no preload**, so web pages have no `window.bridge` and no Node.
- Pages use the session partition `persist:browser`: cookies and storage persist across launches
  and stay apart from the app UI's session.
- The browser leaves Electron's own user agent unchanged, with the `Electron/x` and app tokens.
  VS Code does the same. A stock-Chrome-shaped user agent with no extra product tokens is rejected
  by current Google sign-in.

## Rules

| Event | What happens |
|---|---|
| Address bar text | `parseAddress`: full http(s) URL as typed; a bare host gets https (http for localhost, loopback, and private IPs); anything else becomes a DuckDuckGo search; other schemes are refused |
| Link or redirect to a non-http(s) scheme | Blocked in `will-navigate` and `will-redirect`, with a notice (`file:` links are already blocked by Chromium) |
| Popup, `target="_blank"`, `window.open` | Opens in a new in-app tab with its own child `webContents` and the original opener; no second window |
| HTTP credentials (site or proxy) | Main hides the active view, the renderer shows a form, and the answer goes back to the page; cancel closes the form |
| Download | Cancelled, with a notice naming the file |
| Permission request (camera, microphone, location, notifications, open another app) | Denied; a notice for the common ones |
| Failed main-frame load | Notice with the URL and Chromium's error; `ERR_ABORTED` (-3) is ignored |
| Page crash | Notice asking the user to reload |

Main checks every renderer input again: address text (string, at most 4096 characters) and
bounds (finite numbers).

## Page identity and capture state

- The address field shows the security icon and host while idle and the full URL while editing.
  Tab pills in the unified toolbar show page titles. The sidebar footer shows the active host and
  title on every view.
- The old page strip is gone. Capture state (idle, capturing or reading, added, failed) shows in
  the sidebar footer. See [UI design](./ui-design.md).
- While network recording runs, the Record network button turns red and reads Stop (N), and the
  sidebar footer shows a network line. Switching or closing the active tab stops recording.

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

**Record network** records the active tab's API calls (fetch and XHR) with JSON or text bodies,
pruned and redacted in main, for review in Context. See [Browser capture](./browser-capture.md).

## Keyboard and Inspect

Main handles browser keys on the app window and on every native page view, so the keys work even
while a web page has focus.

| Keys | Action |
|---|---|
| Ctrl+T | New tab |
| Ctrl+W | Close the active tab |
| Ctrl+Tab / Ctrl+Shift+Tab | Next / previous tab, wrapping at the ends |
| Ctrl+1 to Ctrl+9 | Select the numbered tab |
| Ctrl+R / F5 | Reload the active page |
| Alt+Left / Alt+Right | Back / forward |
| Ctrl+L | Focus and select the address field |
| F12 / Ctrl+Shift+I | Inspect the active page |

Right-click a page and choose **Inspect** to open native Chromium developer tools in a separate
window. Inspect stops network recording first because DevTools takes over the same debugger. See
[Browser capture](./browser-capture.md).

## Limits

- Tabs are native views; only the active tab can be captured, read, or recorded.
- Numbered tabs sit on both sides of the fixed 320 px address field. The left group fills first,
  and extra tabs spill into the right group or the all-tabs panel.
- No tab drag reorder, pinned tabs, tab groups, or session restore.
- Capture covers the visible area only, not the full page.
- Google sign-in failed in an earlier native-view attempt and still needs a real-account test.
  Opener-backed sign-in popups now stay in app tabs, but no Chrome or WebView2 fallback exists. ADR
  0005 accepts the remaining sign-in risk.
- See [issue-6 Known_Issues](../issue-6-in-app-browser/Known_Issues.md) for location requests
  and other gaps.
