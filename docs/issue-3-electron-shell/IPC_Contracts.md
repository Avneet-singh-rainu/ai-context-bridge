# IPC Contracts - issue-3

## app:get-info

**Direction:** renderer -> main (invoke)
**Preload API:** `window.bridge.getAppInfo()`
**Main handler:** `registerIpcHandlers` in `src/main/ipc.ts`

### Payload

None. The channel takes no input, so no Zod schema is needed.

### Result - success

```ts
interface AppInfo {
  name: string; // app.getName()
  version: string; // app.getVersion(), from package.json
  electron: string; // process.versions.electron
  chrome: string; // process.versions.chrome
}
```

### Result - errors

| Condition | What the caller receives |
|-----------|--------------------------|
| Handler throws (not expected) | A rejected promise; the status bar keeps showing "Loading app info" |
| Renderer runs outside Electron | `window.bridge` is undefined; the status bar shows "Preview outside Electron" |
