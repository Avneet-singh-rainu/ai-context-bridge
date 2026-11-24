# Known Issues - issue-11

## 1. Google sign-in needs a real-account test

**Status:** Open - needs manual test

**Found:** 2026-11-23

**What happens:** An earlier `WebContentsView` attempt failed Google sign-in. Later Chrome CDP work
hid some bot signals, but the native view no longer uses those Chrome flags. Google may still reject
the page as unsafe or unsupported.

**What was tried:** An earlier build dropped `Electron/x` and app tokens through
`plainChromeUserAgent`. Current Google sign-in rejects that stock-Chrome-shaped user agent. The
browser now leaves Electron's own user agent unchanged, as VS Code does. The old CDP identity flags
are gone with the Chrome process.

**Why not fully fixed here:** Google sign-in needs a real account and a person at the keyboard. TC6
in [Test_Cases.md](Test_Cases.md) records the check. If Google still refuses sign-in, the app shows
a plain notice. ADR 0005 accepts that risk and adds no Chrome fallback.

**Blast radius:** Logged-in Google pages may stay unavailable. Normal browsing, capture, extraction,
and network recording do not depend on sign-in.

---

## 2. The renderer cannot draw over the page area

**Status:** Accepted by design

**Found:** 2026-11-23

**What happens:** The native `WebContentsView` is on top of the app page. App UI cannot overlay the
page box, and the browser view hides when Screenshots or Context is open.

**Why not fully fixed here:** Native views always paint above the renderer. The app keeps the page
hidden outside the Browser view instead of trying to draw over the native view.

**Blast radius:** Browser tooltips from the app UI are not available over the page. The page itself
still draws its own menus and dialogs.

---

## 3. Browser features remain narrow

**Status:** Accepted by design

**Found:** 2026-11-23

**What happens:** The app keeps one page at a time, captures only the visible area, and has no
browser keyboard shortcuts such as F5, Alt+Left, or Ctrl+L.

**Why not fully fixed here:** These limits predate the Chrome work and stay outside this ticket.

**Blast radius:** Users who need tabs, full-page capture, or browser shortcuts need a full browser.
See [issue-6 Known_Issues](../issue-6-in-app-browser/Known_Issues.md).

---

## 4. VS Code study done; sign-in still needs a real-account check

**Status:** Study complete - parity work local - manual check still open

**Added:** 2026-11-23

**Updated:** 2026-11-24

**What the study found:** VS Code's integrated browser uses native `WebContentsView`. For allowed
popups, the page handler returns `action: 'allow'`, a `createWindow` function that returns a child
`webContents`, and `outlivesOpener: true`. VS Code has no Google-specific sign-in code, bot flags,
or special Google user agent. The Simple Browser extension only wraps an iframe and hands off to
the integrated browser.

**What changed locally:** `setWindowOpenHandler` now returns a child `webContents` for allowed
http(s), `about:blank`, and empty-URL popups, so `window.opener` survives sign-in flows. A renderer
form now answers Electron `login` events for HTTP and proxy credentials. Switching or closing the
tab closes the form. The browser no longer rewrites the user agent. The `persist:browser` partition
keeps cookies and sign-in state across launches.

**Why sign-in is still open:** A real Google account and a person at the keyboard are needed. The
form above handles HTTP credentials, not Google's interactive sign-in page. No Chrome fallback,
Chrome overlay, or WebView2 handoff was added. ADR 0005 accepts the remaining risk.

**Blast radius:** Normal browsing, capture, extraction, and network recording are unchanged.
Opener-based sign-in popups now stay inside the app instead of being denied.
