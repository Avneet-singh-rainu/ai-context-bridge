# Changelog - issue-6

## 2026-11-23

- `src/main/browser/browser-view.ts` - one `WebContentsView` in the app window with the
  `persist:browser` session and no preload; navigation, history, bounds, state events, and
  capture. Only http and https load; popups open in the same view; downloads and permission
  requests are refused with a notice. `capturePage` retries up to three times, because right
  after a load Chromium can reject with "UnknownVizError".
- `src/main/browser/user-agent.ts` - drops Electron's `Electron/x` and app tokens from the user
  agent.
- `src/shared/address.ts` - address bar parsing (URL, bare host, DuckDuckGo search, refused
  schemes), page security label, export URL without query string, and capture file names.
- `src/shared/ipc-contract.ts`, `src/preload/index.ts`, `src/main/ipc.ts`, `src/main/index.ts` -
  the `browser:*` channels and the `browser:state` event.
- `src/renderer/src/features/browser/BrowserProvider.tsx`, `BrowserWorkspace.tsx` - address bar,
  back, forward, reload and stop, security badge, title and URL, capture button and capture
  state, notices, and a start panel; the placeholder is gone.
- `src/renderer/src/components/StatusBar.tsx`, `src/renderer/src/App.tsx` - the status bar shows
  the capture state and the active page.
- `src/renderer/src/features/screenshots/ScreenshotsProvider.tsx`, `import-screenshots.ts`,
  `ScreenshotCard.tsx` - `addCapture` adds a browser capture through the import checks and keeps
  its source page; cards show "Captured from <host>".
- `src/renderer/src/features/export/context-markdown.ts` - a "Source page" line and "captured
  from" reference, without the query string.
- `src/renderer/src/styles.css` - browser toolbar, identity bar, notices, and viewport styles.
- `tests/unit/address.test.ts`, `tests/unit/user-agent.test.ts`,
  `tests/unit/context-markdown.test.ts` - 12 new unit tests; 60 in total.
