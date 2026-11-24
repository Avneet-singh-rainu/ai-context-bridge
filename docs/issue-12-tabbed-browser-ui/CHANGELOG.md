# Changelog - issue-12

## 2026-11-23

- Added the Tier 3 ticket and linked ADR 0006, which keeps the native Electron page surface but
  replaces the single-page limit and the old two-bar layout.
- `src/shared/ipc-contract.ts`, `src/main/ipc.ts`, `src/preload/index.ts` - added new tab, close tab,
  and select tab channels, and extended `BrowserState` with tab list and active tab id.
- `src/main/browser/browser-view.ts` - replaced one page view with one view per tab. Main hides every
  inactive view, opens popups in new tabs, closes views on tab close, and deduplicates browser state
  pushes.
- `src/main/browser/browser-runtime.ts`, `src/main/browser/tab-model.ts`,
  `src/main/browser/network-capture.ts` - shared active page access without an import cycle, added
  pure tab order rules, and stopped recording when the active tab changes or closes.
- `src/renderer/src/features/browser/BrowserProvider.tsx` - exposed tab actions and reset capture
  status when the user changes tabs.
- `src/renderer/src/features/browser/BrowserWorkspace.tsx` - moved tabs into the toolbar, added the
  overflow menu, removed the page strip, and throttled viewport bounds messages to one per frame.
- `src/renderer/src/App.tsx`, `src/renderer/src/components/Sidebar.tsx` - added collapsible sidebar
  state and memoised sidebar counts.
- `src/renderer/src/styles.css`, `src/main/window-options.ts` - reduced the toolbar and caption
  overlay to 36 px, styled the unified bar and overflow menu, and added the 60 px sidebar rail.
- `tests/unit/browser-tabs.test.ts`, `tests/unit/window-options.test.ts` - covered tab order rules
  and tied the caption height test to the shared constant.
- ADR 0007 replaced the one-bar layout with a 76 px top notch. All four zones sit in the top edge:
  search and actions, view options and status, and tab cards. The page fills the area below.
- `src/renderer/src/components/TopNotch.tsx`, `LeftNav.tsx`, `BrowserSearch.tsx`,
  `BrowserTabCards.tsx` - split the notch zones into small components and removed the sidebar and
  the separate tab strip.
- ADR 0008 increased notch text to 14 to 15 px, shrank tab cards to 24 px, and replaced the fixed
  column count with a CSS `auto-fill` grid. The `Tabs (n)` label and empty-state text are gone.

## 2026-11-24

- ADR 0009 supersedes ADR 0007 and ADR 0008 and restores the Option A shell. The user rejected the
  four-zone top notch.
- `src/renderer/src/App.tsx`, `src/renderer/src/components/Sidebar.tsx` - brought back the 232 px
  sidebar with live counts, status footer, and a 60 px collapsed rail.
- `src/renderer/src/features/browser/BrowserWorkspace.tsx`, `src/renderer/src/styles.css` - restored
  one 36 px bar with three tab pills, an overflow menu, navigation, address, and page actions. The
  page strip stays removed.
- Removed `TopNotch.tsx`, `LeftNav.tsx`, `BrowserSearch.tsx`, and `BrowserTabCards.tsx`. System docs
  and issue-12 design docs now describe the restored shell.
