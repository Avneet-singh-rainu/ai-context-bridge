# ADR 0004: Show headless Chrome with one frame after input stops

**Status:** Accepted
**Date:** 2026-11-23
**Supersedes:** 0003
**Superseded by:**

## Context

ADR 0003 placed a headed Chrome window over the Electron viewport. Local testing showed the Chrome
window can be dragged outside the app, and the user raised a concern about machines without Chrome.
Chrome app mode hides the tab strip and address bar, but the window is still a separate Windows
window.

ADR 0002's headless engine keeps the page inside the app as an image. The earlier five frames per
second caused lag while scrolling, because each screenshot cost 60-90 ms. Taking a frame only when
the user presses Capture leaves the page frozen during browsing.

## Decision

Run installed Chrome headless with the existing CDP connection. Keep JPEG frames inside the app's
`.browser-viewport` and keep forwarding input through CDP. Replace the 200 ms frame timer with one
scheduled frame after mouse, wheel, key, navigation or resize input stops. Use a 150 ms pause. A
later input event replaces the pending frame. A stale frame is dropped if input arrived while the
screenshot was in flight.

Keep the Capture button unchanged. The 33 ms mouse-move throttle stays in the renderer so CDP does
not receive every pointer event.

## Consequences

### Positive

- No separate Chrome window to move outside the app.
- No screenshot during active scrolling or typing, so input commands are not queued behind JPEG
  capture.
- Google sign-in stays on installed Chrome with the existing profile and identity flags.

### Negative / risks knowingly accepted

- The page still updates in jumps after the user pauses. Fast scrolling can look stale for 150 ms.
- Installed Chrome is still required. A machine without Chrome shows the existing install prompt.
- This ADR is a local MVP. No installer rebuild or reinstall is included.
