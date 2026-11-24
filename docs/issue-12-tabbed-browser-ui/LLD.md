# ISSUE-12 - Low-Level Design

**High-level design:** [HLD.md](HLD.md)

## Files Touched

| File | Change |
|------|--------|
| `src/shared/ipc-contract.ts` | Adds tab state, tab channels, and bridge methods |
| `src/main/browser/browser-view.ts` | Owns the tab list, active tab, views, and tab actions |
| `src/main/browser/browser-runtime.ts` | Shares active page and sender access without an import cycle |
| `src/main/browser/tab-model.ts` | Pure active-tab and insert-position rules |
| `src/main/browser/network-capture.ts` | Reads the active page through the runtime module; accepts a stop notice |
| `src/main/ipc.ts` | Registers new tab channels |
| `src/preload/index.ts` | Exposes new tab bridge methods |
| `src/renderer/src/features/browser/BrowserProvider.tsx` | Exposes tab actions and resets capture state on tab changes |
| `src/renderer/src/components/Sidebar.tsx` | Draws view options, live counts, and the status footer; collapses to an icon rail |
| `src/renderer/src/features/browser/BrowserWorkspace.tsx` | Draws the unified bar, tab pills, overflow menu, and native page viewport |
| `src/renderer/src/App.tsx` | Memoises counts, owns sidebar collapse state, and chooses the active workspace |
| `src/renderer/src/styles.css` | 36 px unified bar, tab pills, overflow menu, and 60 px sidebar rail |
| `src/main/window-options.ts` | Caption overlay height follows the 36 px bar |
| `tests/unit/browser-tabs.test.ts` | Covers tab order rules |
| `tests/unit/window-options.test.ts` | Uses `TOOLBAR_HEIGHT` instead of a literal |

## Process Boundaries & IPC

| Channel | Direction | Payload | Purpose |
|---|---|---|---|
| `browser:new-tab` | renderer to main | none | Add an empty tab and make it active |
| `browser:close-tab` | renderer to main | optional id | Close the given tab or the active tab |
| `browser:select-tab` | renderer to main | id | Make an existing tab active |
| `browser:state` | main to renderer | `BrowserState` | Send tab list, active id, and active page state |

The preload script keeps the same wrapper shape as the existing browser methods. Main validates tab
ids as strings and ignores ids that do not exist. Web page views keep `contextIsolation: true`,
`sandbox: true`, `nodeIntegration: false`, `webviewTag: false`, and no preload.

## Data Model & Validation

`BrowserTabState` holds `id`, `url`, `title`, and `isLoading`. `BrowserState` adds `activeTabId` and
`tabs` to the active page fields used before this ticket. An empty tab has a blank URL and the title
`New tab`.

Main caps address text at 4096 characters and parses it through `parseAddress` before any tab
loads. `setBounds` still accepts only finite numbers. `closeTab` accepts no argument or a string.
`selectTab` accepts only a string that matches an existing tab.

## Logic

- **Create tab:** insert after the active tab or at the end, make the new tab active, and show the
  renderer start panel until a URL loads.
- **Load tab:** create the native view on first navigation, mark the tab as having a page, apply the
  viewport bounds, and load the validated URL.
- **Switch tab:** stop network recording with a notice, hide every view, show the active view, and
  push state.
- **Close tab:** choose the next tab to the right or the last tab to the left, detach and close the
  native view, then push state. Closing the last tab leaves no tabs and shows the start panel.
- **Popup:** allow the child `webContents` and show the popup as a new in-app tab, keeping the
  original opener for sign-in flows; deny other schemes.
- **Push state:** stringify the state and send only when the value changed.
- **Unified bar:** place three tab pills, an overflow menu, a new-tab button, navigation, the address
  field, and the page actions in one 36 px bar. Keep the active tab in view and move other tabs to
  the overflow menu when needed.
- **Sidebar:** keep view options, live counts, and the status footer in the 232 px sidebar. The
  collapse control turns the sidebar into a 60 px icon rail.
- **Page area:** remove the page strip; the native page fills the area below the bar and to the right
  of the sidebar.

## Privacy & Redaction

Tab titles and URLs are page data, so the app keeps them in memory only and shows them in the unified
bar tab pills and overflow menu. No tab title or URL enters the context package unless the user
captures or extracts that page. Page views still use the isolated `persist:browser` partition and have no bridge
to the app. Network bodies keep the existing 1 MB and 200 entry limits and redaction rules.

## Edge Cases & Error Handling

- A failed load stays in the tab and shows a notice on the active tab.
- Closing or switching a tab during recording stops the debugger and shows a network notice.
- A background tab title change updates the tab pill but does not change the active address bar.
- A stale tab id from the renderer is ignored.
- A tab close during page load closes the web contents without affecting other tabs.
- The renderer still works without `window.bridge`: tabs stay empty and the start panel shows.

## Verification / Rollout

See [Test_Cases.md](Test_Cases.md). This change is local until the user approves push, PR,
installer rebuild, and reinstall.
