# ISSUE-12 - High-Level Design

**Systems:** [browser](../_systems/browser.md), [UI design](../_systems/ui-design.md)
**Related:** [issue-11](../issue-11-native-electron-browser/HLD.md) (parent browser path)
**Low-level design:** [LLD.md](LLD.md)

## Context / Problem

The built-in browser had one page at a time. A user could not keep several pages open for research,
capture, or network review. The Browser view also used a tall toolbar plus a page strip, and the
first tab change added a second tab bar. The top of the window used 76 px before the page appeared.

## Goals / Non-goals

### Goals

- Open, switch, and close several native Electron pages inside the app.
- Combine tabs, navigation, address, and page actions into one 36 px bar.
- Keep capture, extract, network recording, isolation, and privacy rules unchanged.
- Let the sidebar collapse to an icon rail.

### Non-goals

- No Chrome process, profile, frame stream, or CDP input path.
- No Google OAuth, WebView2, or system-browser handoff.
- No tab drag reorder, pinned tabs, tab groups, or session restore.
- No capture of a background tab.
- No change to the context package format.

## Current State

See [Browser](../_systems/browser.md) for the native page surface, capture, and extraction rules.
See [UI design](../_systems/ui-design.md) for the shell and toolbar. ADR 0005 removed the Chrome
dependency and kept one page at a time. ADR 0006 keeps the native surface but replaces the
single-page and top-bar rules. ADR 0009 restores the Option A shell after the four-zone attempt.

## Proposed Approach

Main owns a tab list and an active tab. Each tab holds one native page view after its first
navigation. Empty tabs hold no view, so the renderer's start panel shows. Main shows only the active
view over the page box and hides every other view. Popups open as new tabs. Closing the active tab
activates a neighbour. Network recording stops when the active tab changes or closes.

The renderer shows one 36 px bar. The bar holds three tab pills, an overflow menu for extra tabs,
a new-tab button, navigation, the address field, and the page actions. The sidebar keeps the view
options, live counts, and status footer, and collapses to a 60 px icon rail. The native page fills
the area below the bar and to the right of the sidebar. The page strip is gone.

## Component / Data Flow

| From | To | Carries |
|---|---|---|
| Renderer | Main | navigation text, navigation command, tab actions, viewport bounds |
| Main | Renderer | browser state with tab list and active tab id |
| Main | Active page | native view bounds, visibility, navigation command |
| Active page | Main | load, title, navigation, failure, and notice events |
| Main | Renderer | capture PNG, page text, network state |

## Impact & Blast Radius

- The page view, network debugger, capture, and extract code all use the active tab.
- The sidebar footer and Browser workspace read the active page from the same browser state.
- New tab IPC channels need edits in the shared contract, main handlers, preload bridge, and ticket
  IPC docs.
- The window caption overlay height must match the new CSS toolbar height.
- A tab change stops network recording, because the debugger is attached to one web contents.
- Older design docs that say "one page at a time" now point to ADR 0006.
