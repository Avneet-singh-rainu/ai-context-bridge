# IPC Contracts - ISSUE-NNNN

<!-- Only if this ticket adds or changes a message between the Electron main process and the
     renderer. IPC (inter-process communication) is the app's only internal API, and the preload
     script is the only bridge: the renderer never gets Node or Electron objects directly.

     Verify every shape against the actual preload and main-process handler code, not against
     what the design says should happen. A fact about IPC that stays true after this ticket
     closes belongs in docs/_systems/, not only here. -->

## <channel-name>

**Direction:** renderer -> main (invoke) | main -> renderer (event)
**Preload API:** `window.<api>.<method>(...)`
**Main handler:** <module and function that handles the channel>

### Payload

<!-- Name the Zod schema that validates the payload, and where validation runs. The main process
     validates anything the renderer sends; nothing that came from a web page is trusted. -->

```ts
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|

### Result - success

```ts
```

### Result - errors

| Condition | What the caller receives |
|-----------|--------------------------|

<!-- Unexpected errors return a generic message, never the internal exception text or a stack
     trace. Never put cookies, authorization headers, tokens or captured page secrets in a
     payload, a result or a log line. -->
