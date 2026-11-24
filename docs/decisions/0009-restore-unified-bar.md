# ADR 0009: Restore the unified bar and collapsible sidebar

**Status:** Accepted
**Date:** 2026-11-24
**Supersedes:** 0007, 0008 (four-zone layout and typography only)
**Superseded by:**

## Context

ADR 0006 put native browser tabs, navigation, the address field, and page actions into one 36 px
bar. ADR 0007 then replaced the sidebar with a 76 px four-zone top notch. ADR 0008 made the notch
text bigger and the tab cards responsive. The user rejected the four-zone layout and asked for the
earlier Option A shell back.

## Decision

Restore the Option A shell:

- One 36 px bar holds three tab pills, an overflow menu for extra tabs, a new-tab button, back,
  forward, reload, the address field, and the page actions.
- The 232 px sidebar comes back with navigation, live counts, and a footer for the active page,
  capture state, network state, and app version. The sidebar collapses to a 60 px icon rail.
- The native page fills the area below the bar and to the right of the sidebar. The page strip stays
  removed.
- `TopNotch.tsx`, `LeftNav.tsx`, `BrowserSearch.tsx`, and `BrowserTabCards.tsx` are gone.
  `Sidebar.tsx` and `BrowserWorkspace.tsx` own the shell again.
- Native Electron `WebContentsView` stays the page engine. ADR 0005 and ADR 0006 still govern page
  isolation, tab ownership, and capture rules.

## Consequences

- The four-zone decisions stay in the record as history, but ADR 0009 replaces their layout rules.
- System docs, issue-12 design docs, and the task changelog describe the restored Option A shell.
- Normal username and password login still works. Google sign-in stays parked; no Chrome, OAuth,
  WebView2, frame stream, or CDP input path is added.
- Local build verification is enough for this undo. No UI test, installer rebuild, reinstall, push,
  or PR is part of this change.
