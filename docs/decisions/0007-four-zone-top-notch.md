# ADR 0007: Put the four zones in one top notch

**Status:** Accepted
**Date:** 2026-11-23
**Supersedes:** 0006 (top-bar layout only)
**Superseded by:**

## Context

ADR 0006 put tab pills, navigation, the address field, and page actions into one 36 px bar. The
sidebar still used a 232 px column, then a 60 px collapsed rail. The user said the sidebar menus took
too much space and asked for four zones. The user then clarified that all four zones must sit in the
top edge only, like a notch.

## Decision

Use one 76 px top notch instead of a sidebar. The notch has four zones in two rows:

- left top: app mark and the address search with back, forward, reload, Record network, Extract page
  text, and Capture screenshot;
- left bottom: Browser, Screenshots, and Context options with live counts and status chips;
- right half: tab cards, starting with two cards and growing to three columns as tabs are added.

The app page fills the whole area below the notch. The active native page appears in that area. The
right tab cards are controls, not live previews, because a renderer cannot draw over a native view.
Capture and network status stay in the notch. The Windows caption buttons still use a 138 px overlay
area at the right end.

ADR 0005 stays accepted for the native page surface, capture, extract, isolation rules, and the lack
of a Chrome fallback. ADR 0006 stays accepted for native tabs and state rules. ADR 0007 replaces only
the ADR 0006 top-bar layout.

## Consequences

### Positive

- The full-height sidebar and the separate tab strip are gone.
- Search and page actions stay in the top-left zone.
- Tab cards stay visible in the top-right zone and grow from two cards to more columns.
- The page gets the full width below the notch.

### Negative / risks knowingly accepted

- The notch is 76 px tall, taller than the old 36 px bar.
- Tab cards show page data, not live page previews.
- Four zones in one notch leave less room for long tab titles.
- Google sign-in still needs a real-account test. ADR 0007 adds no Chrome, OAuth, or WebView2 fallback.
- The change is local. Push, installer rebuild, and reinstall need explicit approval.
