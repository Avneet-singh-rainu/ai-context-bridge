# IPC Contracts - issue-6

All handlers live in `src/main/browser/browser-view.ts` and are registered in `src/main/ipc.ts`.
Types live in `src/shared/ipc-contract.ts`.

## browser:navigate

**Direction:** renderer -> main (invoke)
**Preload API:** `window.bridge.browserNavigate(input)`

**Payload:** the address bar text as a string, at most 4096 characters.

**Result:** `{ ok: true, url }` with the URL that started loading, or `{ ok: false, error }`.

| Condition | What the caller receives |
|-----------|--------------------------|
| Not a string, or longer than 4096 characters | `{ ok: false, error: 'The address is not valid.' }` |
| Empty text | `{ ok: false, error: 'Enter a web address or words to search for.' }` |
| A scheme other than http or https | `{ ok: false, error: 'Only http and https pages can be opened.' }` |
| The page fails to load | `{ ok: true }`; the failure arrives later as a `browser:state` notice |

## browser:command

**Direction:** renderer -> main (invoke)
**Preload API:** `window.bridge.browserCommand(command)`

**Payload:** `'back' | 'forward' | 'reload' | 'stop'`. Anything else is ignored; back and forward
do nothing when history has no entry in that direction.

**Result:** nothing.

## browser:set-bounds

**Direction:** renderer -> main (send, no reply)
**Preload API:** `window.bridge.browserSetBounds(bounds)`

**Payload:** `{ x, y, width, height, visible }` in CSS pixels of the app window. Main ignores the
message unless all four numbers are finite, then scales them by the app page's zoom factor.

## browser:get-state

**Direction:** renderer -> main (invoke)
**Preload API:** `window.bridge.browserGetState()`

**Result:** the current `BrowserState` (see below). Used once when the renderer starts.

## browser:capture

**Direction:** renderer -> main (invoke)
**Preload API:** `window.bridge.browserCapture()`

**Result:**

```ts
type CaptureResponse =
  | { ok: true; bytes: Uint8Array; source: { url: string; title: string; capturedAt: string } }
  | { ok: false; error: string };
```

| Condition | What the caller receives |
|-----------|--------------------------|
| No page open | `{ ok: false, error: 'Open a page first.' }` |
| The page is still loading | `{ ok: false, error: 'Wait for the page to finish loading.' }` |
| No frame after three tries | `{ ok: false, error: 'The page could not be captured. Try again.' }` |
| PNG over 20 MB | `{ ok: false, error: 'The capture is larger than 20 MB.' }` |

## browser:state

**Direction:** main -> renderer (event)
**Preload API:** `window.bridge.onBrowserState(listener)`, which returns an unsubscribe function.
The listener receives only the state, never the IPC event.

```ts
interface BrowserState {
  hasPage: boolean;
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  security: 'secure' | 'local' | 'not-secure';
  notice?: { kind: 'error' | 'info'; text: string };
}
```

Sent after every load start and stop, navigation, in-page navigation, title change, and notice.
