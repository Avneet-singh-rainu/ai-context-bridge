# issue-11 - Low-Level Design

**High-level design:** [HLD.md](HLD.md)

## Files Touched

| File | Change |
|---|---|
| `src/main/browser/browser-view.ts` | Own one `WebContentsView`, apply bounds, watch page events, capture PNGs and extract text |
| `src/main/browser/network-capture.ts` | Record network through `webContents.debugger` on the native page |
| `src/main/browser/page-extract.ts` | Read the page through Electron's isolated world |
| `src/main/index.ts` | Attach the native browser view to the app window |
| `src/main/ipc.ts`, `src/preload/index.ts` | Keep the original browser IPC handlers and bridge methods |
| `src/shared/ipc-contract.ts` | Remove `browser:input`, `browser:frame`, `BrowserInput` and `BrowserFrame` |
| `src/renderer/src/features/browser/BrowserProvider.tsx`, `BrowserWorkspace.tsx` | Remove frame subscription and input forwarding; keep the viewport placeholder |
| `src/renderer/src/styles.css` | Remove the frame image style |
| `src/main/browser/chrome-cdp.ts`, `chrome-input.ts`, `chrome-launcher.ts` | Removed; no separate browser process |
| `src/shared/input-throttle.ts` | Removed; native input goes straight to the Electron view |
| `tests/unit/chrome-cdp.test.ts`, `chrome-input.test.ts`, `chrome-launcher.test.ts`, `input-throttle.test.ts` | Removed with the Chrome code |

## Process Boundaries & IPC

- The page lives in the main process as an Electron `WebContentsView`. No renderer code sees page
  web contents or a debugger session.
- No new channels are needed. `browser:input` and `browser:frame` are gone.
- The renderer sends `browser:navigate`, `browser:command`, `browser:set-bounds`,
  `browser:get-state`, `browser:capture`, `browser:extract`, and the network commands.
- See [IPC_Contracts.md](IPC_Contracts.md) for the channel list.

## Data Model & Validation

- `BrowserState` holds `hasPage`, URL, title, loading, back and forward, security, and a notice.
- `BrowserBounds` holds finite x, y, width, height, and a visible flag in renderer CSS pixels.
- Main scales bounds by the app window's zoom factor before calling `view.setBounds()`.
- Main checks address text (string, at most 4096 characters) and bounds (finite numbers) again.

## Logic

- **Create the view on first navigation.** Use the `persist:browser` session with no preload, no
  Node, `contextIsolation`, `sandbox`, and `webviewTag: false`.
- **Place the view.** Apply renderer bounds after mount, window resize, and zoom changes. Hide the
  view when Screenshots or Context is open, but keep the page.
- **Harden the session.** Deny permissions and downloads, show plain notices, block non-http(s)
  navigation, and open popups as child tabs that keep the original opener.
- **Watch page events.** Push state on load, navigation, title change, and notice. Ignore
  `ERR_ABORTED` (-3), which only means a load was replaced.
- **Capture screenshot.** Call `webContents.capturePage()`. If Chromium has no frame yet, repaint and
  retry up to three times. Return PNG bytes through the existing import checks.
- **Extract text.** Run the extraction script in Electron's isolated world, then validate, limit,
  and redact the result in main.
- **Record network.** Attach Electron's debugger while recording, read `Network` events, fetch
  bodies, and remove headers, cookies, and request bodies before storage.

## Privacy & Redaction

- Web pages have no preload and no `window.bridge`. Page scripts cannot reach the app UI.
- Response bodies are pruned and redacted in main before the renderer or Context sees them.
- No cookies, authorization headers, request bodies, tokens, or keys are stored by the app.

## Edge Cases & Error Handling

- Failed main-frame load: show the URL and Chromium's error; ignore `ERR_ABORTED`.
- Page crash: show a notice asking the user to reload.
- Download or permission request: deny the request and show a plain notice.
- Popup or `target="_blank"`: return a child `webContents` as a new in-app tab and keep the opener;
  block other schemes.
- HTTP credentials: pause the request, hide the native view, show the renderer form, and answer or
  cancel; switching or closing the tab also closes the form.
- Resize or zoom: recompute view bounds from renderer CSS pixels and the app zoom factor.
- Google sign-in rejection: show a plain notice. ADR 0005 accepts this risk and adds no Chrome
  fallback.

## Verification / Rollout

- Run the cases in [Test_Cases.md](Test_Cases.md) on Windows with the local Electron build.
- No Chrome install is needed for this path. The installed app stays unchanged until a separate
  installer rebuild is approved.
