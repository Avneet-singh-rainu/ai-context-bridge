# ADR 0003: Show Chrome as an app window over the browser viewport

**Status:** Accepted
**Date:** 2026-11-23
**Supersedes:** 0002
**Superseded by:**

## Context

ADR 0002 runs installed Chrome headless and shows the page as JPEG screenshots pushed about five
times each second. Local measurements on a logged-in page found each screenshot took 60-90 ms and
raised input reply time from 9 ms to 21 ms at the 95th percentile. Scrolling and clicking new links
felt slow. Taking screenshots only when the user clicks Capture is not enough, because a headless
page has no visible surface: the app would show a blank or frozen rectangle while the user browses.

The product still needs Google sign-in to work. ADR 0001's Electron browser cannot provide that
session, so the page engine stays in installed Chrome.

## Decision

Launch installed Chrome in headed app mode with no tab strip or address bar. Position the Chrome
window over the browser viewport in the Electron window. Chrome paints the page and receives mouse,
keyboard and scroll input directly. The main process keeps the CDP connection for navigation state,
page text, network events and the screenshot requested by Capture. The renderer no longer receives
automatic page frames and no longer forwards input to Chrome.

The Chrome window is owned by the Electron window so it stays above the app while the app is active.
The main process moves and hides the Chrome window when the renderer reports a new viewport box or
when the app window is minimised, moved or resized. This ADR applies to Windows first.

## Consequences

### Positive

- No automatic screenshot capture. The 60-90 ms JPEG capture no longer sits in the input path.
- Scrolling, text selection and IME input are handled by Chrome itself.
- Google sees a supported, visible Chrome browser with the persistent profile from ADR 0002.

### Negative / risks knowingly accepted

- The page is a separate OS window layered over the app. Window focus, z-order and multi-monitor
  scaling need careful handling.
- The renderer page area is a placeholder with no image. If window placement fails, the user sees
  an empty area instead of a page.
- Capture screenshot still asks Chrome for a PNG through CDP, but only when the user asks.
- Chrome must still be installed on the user's machine.
