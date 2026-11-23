# ADR 0002: Use installed Chrome as the page engine

**Status:** Accepted
**Date:** 2026-11-23
**Supersedes:** 0001
**Superseded by:**

## Context

ADR 0001 chose Electron as both the desktop shell and the browser host. Issue 6 built the browser
with `WebContentsView`. Google sign-in rejects that browser as unsafe or unsupported, even when
the user agent hides Electron tokens. Google checks browser identity signals beyond the user agent
string, and Electron's embedded Chromium does not provide them.

The product needs logged-in Google pages inside the app. A plain user-agent change cannot provide
that, because the app browser would still not hold the Google session.

## Decision

Keep Electron + React + TypeScript for the shell and UI. Replace only the page engine with an
installed Google Chrome driven through the Chrome DevTools Protocol (CDP), which is Chrome's event
and command interface. Run Chrome headless with a persistent profile, show CDP screenshots in the
renderer, and forward input through CDP. The main process owns the CDP connection and all capture
work. The renderer receives framed images and structured state only.

## Consequences

### Positive

- Google sees a supported Chrome browser, so sign-in and authenticated pages work.
- The persistent Chrome profile keeps cookies across app restarts.
- One CDP path covers page frames, DOM text, network events and page screenshots.

### Negative / risks knowingly accepted

- Google Chrome must be installed on the user's machine. Without Chrome, the app shows a clear
  install prompt or falls back to the existing Electron browser while that fallback exists.
- Headless Chrome can still be flagged by anti-bot checks. If Google rejects headless sign-in,
  the fallback is a headed Chrome window layered over the app viewport.
- Rendering screenshots and forwarding input needs work for scroll, focus, text input and
  performance.
- ADR 0001's browser-host choice is superseded. Electron remains the shell and UI host.
