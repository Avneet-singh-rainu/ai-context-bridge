# Known Issues - issue-11

## 1. Google sign-in needs a real-account test

**Status:** Open - needs manual test

**Found:** 2026-11-23

**What happens:** An earlier `WebContentsView` attempt failed Google sign-in. Later Chrome CDP work
hid some bot signals, but the native view no longer uses those Chrome flags. Google may still reject
the page as unsafe or unsupported.

**What was tried:** Electron's user agent drops `Electron/x` and app tokens through
`plainChromeUserAgent`. The old CDP identity flags are gone with the Chrome process.

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
