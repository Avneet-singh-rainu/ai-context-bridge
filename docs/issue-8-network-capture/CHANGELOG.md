# Changelog - issue-8

## 2026-11-23

- `src/shared/network.ts` - `NETWORK_LIMITS`, `NetworkEntry`, `NetworkState`, endpoint and query
  key split (`endpointParts`), request type and content type filters (`isApiResource`,
  `responseKind`), JSON pruning (`pruneJson`) and body reduction (`reduceBody`).
- `src/main/browser/network-store.ts` - `addResponse`: merge by method and endpoint, the endpoint
  limit, pruning, then `redactSecrets`.
- `src/main/browser/network-capture.ts` - the recorder: debugger attach, `Network.enable` with
  buffer limits and a one-second wait, request, response, and loading events, body reads up to
  1 MB, stop on Stop, cross-origin navigation, or detach, and throttled state pushes.
- `src/main/browser/browser-view.ts` - `getPageContents` and `sendToApp` for the recorder.
- `src/shared/ipc-contract.ts`, `src/preload/index.ts`, `src/main/ipc.ts` - the `network:*`
  channels and the `network:state` event.
- `src/shared/redact.ts` - labelled secrets also match JSON keys (`"api_key": "..."`).
- `src/renderer/src/features/capture/NetworkProvider.tsx`, `NetworkEditor.tsx` - network state
  in the renderer, user edits with Restore, and the review box.
- `src/renderer/src/features/context/context-model.ts`, `review-store.ts` - network items and
  opt-in sources (`optedIn`); `ContextGroupBlock.tsx` - network boxes and Clear all;
  `ContextWorkspace.tsx` - network items in the package.
- `src/renderer/src/features/export/context-markdown.ts` - Network data section, compact
  responses, privacy labels, and source references.
- `src/renderer/src/features/browser/BrowserWorkspace.tsx`, `components/Sidebar.tsx`,
  `App.tsx`, `styles.css` - Record network button, recording state, notice with Reload and
  close, footer line, Context count, and styles.
- `tests/unit/network.test.ts`, `redact.test.ts`, `review-store.test.ts`,
  `context-package.test.ts` - 15 new unit tests; 107 in total.
