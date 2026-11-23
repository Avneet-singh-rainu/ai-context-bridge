# ADR 0005: Use Electron's native browser view again

**Status:** Accepted
**Date:** 2026-11-23
**Supersedes:** 0002, 0003, 0004
**Superseded by:**

## Context

ADR 0002 moved web pages from Electron's `WebContentsView` to an installed Google Chrome process
driven by CDP. Local work found three problems with that path:

- Headless Chrome needed repeated JPEG screenshots. The measured screenshot calls took
  `88, 78, 55, 49, 68, 57, 160, 61, 49, 57` ms and made scrolling feel slow.
- The headed Chrome overlay from ADR 0003 is a separate Windows window. A user can drag the Chrome
  window away from the app.
- Both CDP designs still need installed Google Chrome. A machine without Chrome gets an install
  prompt.

The user chose to remove the Chrome dependency and use Electron's native browser surface, even
though an earlier Google sign-in attempt on `WebContentsView` failed.

## Decision

Use one Electron `WebContentsView` as the page surface again. Electron embeds Chromium internally;
the app does not start Google Chrome, does not create a Chrome profile, and does not require Chrome
to be installed. The renderer measures the page box and main places the native view over that box.
Electron paints the page directly, so no JPEG frame pump, frame IPC channel, input IPC channel, or
CDP input forwarding is needed.

Keep the existing app shell, isolation rules, navigation rules, page extraction, screenshot capture,
and network recording. Network recording still uses `webContents.debugger`, which speaks the Chrome
DevTools Protocol; that debugger targets Electron's own page and needs no separate browser.

ADRs 0002, 0003, and 0004 stay in the repository as history of the rejected Chrome attempts. Design
documents describe the native Electron path.

## Consequences

### Positive

- No separate Chrome window can move away from the app.
- No Chrome install is needed on the user's machine.
- No screenshot runs during scrolling or typing, because Electron paints the native view directly.
- The browser IPC contract stays small: state, bounds, navigate, command, capture, and extract.

### Negative / risks knowingly accepted

- Google sign-in failed in an earlier `WebContentsView` attempt. A real-account sign-in test is
  required. If Google still rejects the native view, the app shows a plain notice; no Chrome fallback
  is built.
- The renderer cannot draw over the native page area.
- One page at a time remains the rule. There are no tabs.
- This change is local. No installer rebuild or reinstall is included.
