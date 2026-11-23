# issue-8 - Capture network requests and permitted response bodies

**Systems:** [browser-capture](../_systems/browser-capture.md), [browser](../_systems/browser.md),
[context-package](../_systems/context-package.md)
**Related:** [issue-2](../issue-2-electron-feasibility/Design.md) (spike that proved the capture
path), [issue-9](../issue-9-context-review/Design.md) (review and export this feeds)

## Context / Problem

A page often loads its real data through API calls rather than the HTML. Opening one page can
fire 20 or more requests, and some responses are megabytes of JSON. Pasting raw responses into
the package would overflow a free AI chat ("input is too long") and could leak tokens or personal
data. The recorder has to collect what is useful from the active page and keep the package small
and safe.

## Design

### Recording session

- **Record network** in the Browser toolbar starts a session on the active page. The page is not
  reloaded automatically; a notice says "Reload the page to include requests made while it
  loads" and carries a Reload button.
- While recording, the button turns red and reads **Stop (N)** with the number of endpoints kept;
  the page strip shows "Recording · N endpoints" with a pulsing dot, and the sidebar footer shows
  a network line on every view (docs/PRIVACY.md: visible indicator).
- The session ends on Stop, on navigation to another origin (notice: "Recording stopped: the page
  moved to another site."), or when the debugger detaches (error notice). Kept responses stay
  until the user removes them or uses Clear all.
- Main attaches the Chrome DevTools Protocol debugger to the browser view's `webContents` only
  while recording and detaches it when the session ends
  ([browser-capture](../_systems/browser-capture.md)).

### What is kept

- Only requests of type XHR, Fetch, or Other whose response is JSON (`application/json`, any
  `+json`) or text (`text/plain`, `text/csv`). Documents, scripts, styles, images, fonts, and
  media are counted as ignored and not stored.
- Request bodies and all headers (request and response) are never stored. Query values are
  dropped; only query key names are kept.
- Calls with the same method and endpoint (origin and path) merge into one entry with a call
  count; the newest body replaces the older one. Twenty polling calls become one entry.

### Size rules

The numbers live in `NETWORK_LIMITS` (`src/shared/network.ts`).

| Rule | Value |
|---|---|
| Endpoints kept | 200; later new endpoints are counted as skipped |
| Body read per response | 1 MB; a larger body keeps its details only, with a note |
| Body kept per response | 8,000 characters, plus a one-line cut marker when cut |
| Arrays in JSON | first 3 items, then `"(+N more items)"` |
| Objects in JSON | first 50 keys, then a `"(+N more keys)"` entry |
| Strings in JSON | cut at 200 characters; base64 runs and data URLs removed |
| Nesting depth | 6 levels; deeper parts summarized |

JSON is pruned by structure, so the kept text is still valid JSON that shows the data's keys,
types, and a few sample items. A second, tighter pass runs if the first is still over the cap.
Text is cut at a line break. Secrets are redacted with `redactSecrets` after pruning, in main,
before the renderer sees anything.

### Review and export

- Each endpoint is a context item under **Network data** in Context, **left out by default**
  (an opt-in source). The user switches on the ones that matter.
- Each item shows method, path, status, host, content type, how many calls merged, the size
  before and after pruning, pruning and redaction notes, and the query key names. The kept text
  is editable, with Restore; Remove drops one item and Clear all drops every item.
- In the detailed package, a `## Network data` section lists each included response with status,
  calls, size, capture time and page, notes, and the body in a fenced `json` or `text` block
  labelled as data. The compact package has one `## Response N` section per response.
- Export redacts and hides emails again, like every source
  ([context-package](../_systems/context-package.md)).

## Verification / Rollout

Verified in the Electron dev app against a local busy page (`/shop`) that fires 25 API calls on
load, plus a polling endpoint every 400 ms, then again in the packaged app. See
[Test_Cases.md](./Test_Cases.md).
