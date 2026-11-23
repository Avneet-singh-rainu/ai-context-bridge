# IPC Contracts - issue-11

Both new channels are declared in `IPC_CHANNELS` (`src/shared/ipc-contract.ts`), exposed by
`src/preload/index.ts`, and handled in `src/main/ipc.ts` by functions in
`src/main/browser/browser-view.ts`. The CDP socket and the Chrome profile stay in main; the renderer
never receives either.

## browser:input

**Direction:** renderer -> main (send, no reply)
**Preload API:** `window.bridge.browserSendInput(input)`
**Main handler:** `input` in `browser-view.ts`, through `dispatchInput` in `chrome-input.ts`

### Payload

A `BrowserInput` union from `src/shared/ipc-contract.ts`:

| Type | Fields | CDP command |
|------|--------|-------------|
| `mouseMove` | `x`, `y`, `buttons?` | `Input.dispatchMouseEvent` (`mouseMoved`) |
| `mouseDown` / `mouseUp` | `x`, `y`, `button?`, `clickCount?` | `Input.dispatchMouseEvent` (`mousePressed` / `mouseReleased`) |
| `wheel` | `x`, `y`, `deltaX`, `deltaY` | `Input.dispatchMouseEvent` (`mouseWheel`) |
| `keyDown` / `keyUp` | `key`, `code?`, `text?` | `Input.dispatchKeyEvent` |
| `text` | `text` | `Input.insertText` |

All pointer types also accept `altKey`, `ctrlKey`, `metaKey` and `shiftKey`. Main drops malformed
events: coordinates must be finite and between 0 and 32767, deltas must be finite, and text must be
1 to 4096 characters. Input sent before a page opens is ignored.

## browser:frame

**Direction:** main -> renderer (event)
**Preload API:** `window.bridge.onBrowserFrame(listener)`, which returns an unsubscribe function
**Sender:** `pumpFrame` in `browser-view.ts`, through `sendToApp`

Sent about five times a second while a page is open and the browser viewport is visible. Each event
carries a fresh JPEG of the visible page area.

```ts
interface BrowserFrame {
  data: string;      // base64 JPEG from Page.captureScreenshot
  width: number;     // device pixels, scaled by the app's zoom factor
  height: number;
  sequence: number;  // increases with every frame
}
```

The renderer draws the newest frame in an `<img>` and scales input coordinates by
`frame.width / viewport.width` before sending `browser:input`. A failed screenshot keeps the last
frame; no error text reaches the renderer through this channel.

## Existing channels

`browser:navigate`, `browser:command`, `browser:set-bounds`, `browser:get-state`, `browser:capture`
and `browser:extract` keep their names and payload shapes. Only the main-process implementation
changes: Electron's `WebContentsView` and debugger are replaced with an installed Chrome page driven
by CDP. See [issue-6 IPC contracts](../issue-6-in-app-browser/IPC_Contracts.md) and
[issue-8 IPC contracts](../issue-8-network-capture/IPC_Contracts.md) for the original definitions.
