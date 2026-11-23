# IPC Contracts - issue-11

No new channels were added for the native Electron browser. The Chrome-only `browser:input` and
`browser:frame` channels were removed from `IPC_CHANNELS`, `src/preload/index.ts`, and
`src/main/ipc.ts`. The renderer no longer sends page input or receives page images.

## Browser channels in use

| Channel | Direction | Payload | Handler |
|---|---|---|---|
| `browser:navigate` | renderer -> main | Address string | `navigate` in `browser-view.ts` |
| `browser:command` | renderer -> main | `back`, `forward`, `reload`, or `stop` | `runCommand` in `browser-view.ts` |
| `browser:set-bounds` | renderer -> main | `BrowserBounds` in CSS pixels | `setBounds` in `browser-view.ts` |
| `browser:get-state` | renderer -> main | none | `getState` in `browser-view.ts` |
| `browser:state` | main -> renderer | `BrowserState` | `onBrowserState` in the preload bridge |
| `browser:capture` | renderer -> main | none | `capture` in `browser-view.ts` |
| `browser:extract` | renderer -> main | none | `extractPage` in `browser-view.ts` |

`browser:capture` returns PNG bytes plus the source URL, title, and time. `browser:extract` returns
limited and redacted page text. Both use Electron's native page web contents.

The network channels keep their issue-8 names and payloads. See
[issue-6 IPC contracts](../issue-6-in-app-browser/IPC_Contracts.md) and
[issue-8 IPC contracts](../issue-8-network-capture/IPC_Contracts.md) for the original definitions.
