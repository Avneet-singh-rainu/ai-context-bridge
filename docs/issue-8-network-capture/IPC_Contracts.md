# IPC Contracts - issue-8

All channels are declared in `IPC_CHANNELS` (`src/shared/ipc-contract.ts`), exposed by
`src/preload/index.ts`, and handled in `src/main/ipc.ts` by functions in
`src/main/browser/network-capture.ts`. No channel carries headers, cookies, or request bodies;
response text is pruned and redacted in main before it is sent.

## network:start

**Direction:** renderer -> main (invoke)
**Preload API:** `window.bridge.networkStart()`
**Main handler:** `startRecording`

### Payload

None.

### Result - success

```ts
{ ok: true }
```

Also returned when a session is already running.

### Result - errors

| Condition | What the caller receives |
|-----------|--------------------------|
| No page is open | `{ ok: false, error: 'Open a page first.' }` |
| The page is not http or https | `{ ok: false, error: 'Only http and https pages can be recorded.' }` |
| The debugger cannot attach | `{ ok: false, error: 'Recording could not start: <reason>' }` |

## network:stop, network:clear

**Direction:** renderer -> main (invoke)
**Preload API:** `window.bridge.networkStop()`, `window.bridge.networkClear()`
**Main handler:** `stopRecording`, `clearNetwork`

No payload; resolve to nothing. Stop ends the session and keeps the entries. Clear removes every
entry and resets the counters; a running session keeps running.

## network:remove

**Direction:** renderer -> main (invoke)
**Preload API:** `window.bridge.networkRemove(id)`
**Main handler:** `removeNetworkEntry`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | An entry id; anything else is ignored |

Resolves to nothing; an unknown id changes nothing.

## network:get-state

**Direction:** renderer -> main (invoke)
**Preload API:** `window.bridge.networkGetState()`
**Main handler:** `getNetworkState`

Resolves to `NetworkState` (`src/shared/network.ts`).

## network:state

**Direction:** main -> renderer (event)
**Preload API:** `window.bridge.onNetworkState(listener)`, which returns an unsubscribe function
**Sender:** `push` in `network-capture.ts`, through `sendToApp`

Sends `NetworkState` after every change, at most once every 300 ms while responses arrive, and at
once on start, stop, clear, and remove.

```ts
interface NetworkState {
  recording: boolean;
  startedAt?: string;          // ISO 8601
  origin?: string;             // the site being recorded
  seen: number;                // API responses kept or merged
  ignored: number;             // not API calls, or not JSON or text
  failed: number;              // body could not be read
  skipped: number;             // new endpoints after the 200 limit
  entries: NetworkEntry[];     // method, endpoint, queryKeys, status, mimeType, kind, calls,
                               // originalBytes, text, truncated, redactions, note, pageUrl, lastAt
  notice?: { kind: 'info' | 'error'; text: string };
}
```
