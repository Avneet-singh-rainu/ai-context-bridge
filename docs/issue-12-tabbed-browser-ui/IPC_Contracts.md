# IPC contracts - issue-12

The shared contract lives in `src/shared/ipc-contract.ts`. The renderer never receives Electron or
Node objects.

| Channel | Direction | Payload | Preload API | Result |
|---|---|---|---|---|
| `browser:new-tab` | renderer to main | none | `browserNewTab()` | `void`; `browser:state` follows |
| `browser:close-tab` | renderer to main | `id?: string` | `browserCloseTab(id?)` | `void`; `browser:state` follows |
| `browser:select-tab` | renderer to main | `id: string` | `browserSelectTab(id)` | `void`; `browser:state` follows |
| `browser:state` | main to renderer | `BrowserState` | `onBrowserState(listener)` | tab list and active page state |

## BrowserState

```ts
interface BrowserTabState {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
}

interface BrowserState {
  activeTabId: string | null;
  tabs: BrowserTabState[];
  hasPage: boolean;
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  security: PageSecurity;
  notice?: { kind: 'error' | 'info'; text: string };
}
```

The active page fields repeat the active tab's values so the existing sidebar and capture code keep
one source of truth. Main sends the state only when a value changed.
