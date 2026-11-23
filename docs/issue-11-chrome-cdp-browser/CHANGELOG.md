# Changelog - issue-11

## 2026-11-23

- `docs/decisions/0002-chrome-cdp-browser.md` - replaced the Electron browser-host choice with an
  installed Chrome page engine driven by CDP.
- `docs/issue-11-chrome-cdp-browser/` - added the Tier 3 design, test cases and known issues.
- `src/main/browser/chrome-launcher.ts` - added Chrome discovery, headless launch arguments,
  debugging endpoint parsing and process ownership.
- `tests/unit/chrome-launcher.test.ts` - covered Chrome discovery, launch arguments and endpoint
  parsing.
- `src/main/browser/chrome-cdp.ts` - added a CDP WebSocket client with command matching, event
  fan-out, one attached page, viewport control, screenshots, isolated-world evaluation and history.
- `tests/unit/chrome-cdp.test.ts` - covered connect, command matching, error replies, event routing
  and page creation with a fake socket.
- `src/main/browser/chrome-input.ts` - mapped renderer mouse, wheel, key and text events to CDP
  Input commands with bounds checks and a Windows virtual-key table.
- `tests/unit/chrome-input.test.ts` - covered every input type and malformed events.
- `src/main/browser/browser-view.ts` - replaced `WebContentsView` with the Chrome process, CDP
  page, JPEG frame pump and input forwarding; kept the existing navigation, capture, extract and
  state API. Downloads are denied and popups open in the single page.
- `src/main/browser/network-capture.ts` - replaced `webContents.debugger` with page CDP events and
  `Network.getResponseBody` on the Chrome page.
- `src/main/browser/page-extract.ts` - moved extraction from Electron's isolated world to a CDP
  isolated world on the Chrome page.
- `src/shared/ipc-contract.ts`, `src/preload/index.ts`, `src/main/ipc.ts` - added `browser:input`
  and `browser:frame` channels; the renderer never receives the CDP socket.
- `src/renderer/src/features/browser/BrowserProvider.tsx`, `BrowserWorkspace.tsx`, `styles.css` -
  drew JPEG frames in the viewport and forwarded pointer, wheel, key and paste events.
- `docs/_systems/browser.md`, `docs/_systems/browser-capture.md`, `docs/_systems/app-shell.md`,
  `docs/ARCHITECTURE.md` - updated the durable descriptions to the Chrome CDP architecture.
- `src/main/browser/chrome-cdp.ts` - reuses Chrome's startup `about:blank` target instead of creating
  a second page, so the app keeps one CDP page.
- `tests/unit/chrome-cdp.test.ts` - covered startup-page reuse, creation fallback and target
  filtering.
- `src/main/browser/chrome-launcher.ts` - deletes a stale `DevToolsActivePort` before launching Chrome
  so a previous session's dead port cannot break the next launch.
- `tests/unit/chrome-launcher.test.ts` - covered stale port removal.
- `src/main/browser/chrome-launcher.ts` - added `--disable-blink-features=AutomationControlled` so
  pages read `navigator.webdriver` as false.
- `src/main/browser/chrome-cdp.ts` - removes the `Headless` token from Chrome's own user agent before
  the first navigation with `Network.setUserAgentOverride`.
- `tests/unit/chrome-cdp.test.ts` - covered the user-agent override and page setup replies.
- `docs/_systems/browser.md` - recorded the browser identity flags.
- Manual test: DuckDuckGo showed its "Please try again" bot check for a `linkedin` search. With the
  two identity changes, the same search returned normal results in a standalone Chrome run.
