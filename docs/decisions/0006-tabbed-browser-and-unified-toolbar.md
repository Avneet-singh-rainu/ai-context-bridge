# ADR 0006: Add browser tabs and one unified top bar

**Status:** Accepted
**Date:** 2026-11-23
**Supersedes:** 0005 (single-page and toolbar limits only)
**Superseded by:**

## Context

ADR 0005 restored Electron's native `WebContentsView` and deliberately kept one page at a time.
Local use showed two problems:

- A user could open only one page in the built-in browser. Research and capture across several
  pages needed a new tab, but no tab control existed.
- The Browser view used a 52 px toolbar and a 30 px page strip. The first UI change added a 34 px
  tab strip, so the top of the window used two bars and 76 px before the page appeared.

The user chose Option A from three designs: one 36 px bar with visible tab pills, an overflow menu
for extra tabs, navigation buttons, the address field, and the page actions.

## Decision

Keep Electron's native page view, but own one view per browser tab. Main stores a list of tabs, the
active tab id, and per-tab state. Only the active view is visible over the renderer's page box.
New tabs open next to the active tab; popups and `target="_blank"` links open in a new tab. Closing
a tab activates the next tab to the right, or the last tab to the left. Network recording stops when
the active tab changes or closes, because the debugger is attached to one web contents.

The Browser workspace draws one 36 px toolbar. The tab pills, overflow menu, navigation buttons,
address field, and action buttons share that row. The old page strip is removed; page identity
stays in the address field, and capture state stays in the sidebar footer. The sidebar can collapse
to a 60 px icon rail.

ADR 0005 stays accepted for the native Electron page surface, capture, extract, isolation rules, and
the lack of a Chrome fallback. ADR 0006 replaces only the single-page rule and the old top-bar
layout.

## Consequences

### Positive

- Users can keep several pages open and switch between native Electron views.
- The top of the Browser view uses 36 px instead of 76 px, leaving more room for the page.
- Tabs remain visible without a second bar. More than three tabs use a small overflow menu.
- The sidebar can collapse when the user wants more width.
- Main sends browser state only when a value changed, so page events do not flood the renderer.

### Negative / risks knowingly accepted

- Each open tab holds a web contents and its own page memory.
- Only the active tab can be captured, read, or recorded at a time.
- The renderer cannot draw over the native page area, so the tab menu is drawn in the app toolbar.
- Google sign-in still needs a real-account test. This ADR adds no OAuth, WebView2, or Chrome
  fallback.
- The change is local. Push, installer rebuild, and reinstall need explicit approval.
