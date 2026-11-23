# issue-8 - Capture network requests and permitted response bodies

**Systems:** [browser-capture](../_systems/browser-capture.md), [browser](../_systems/browser.md),
[context-package](../_systems/context-package.md)
**Related:** [issue-2](../issue-2-electron-feasibility/Design.md) (spike that proved the capture
path), [issue-9](../issue-9-context-review/Design.md) (review and export this feeds)

This is a design written before any code. Nothing here is built yet.

## Context / Problem

A page often loads its real data through API calls rather than the HTML. Opening one page can
fire 20 or more requests, and some responses are megabytes of JSON. Pasting raw responses into
the package would overflow a free AI chat ("input is too long") and could leak tokens or personal
data. The capture has to collect what is useful from the active page and keep the package small
and safe.

## Design

### Capture session

- Capture starts only when the user clicks Start capture on the active browser page and stops on
  Stop capture or navigation away; the capture indicator stays visible the whole time
  (docs/PRIVACY.md).
- The Chrome DevTools Protocol path proved in the spike is used on the browser view: request and
  response events, then the response body after loading finishes.
- Only the active page's own requests are observed.

### What is kept

- Only JSON and text responses (`application/json`, `+json`, `text/plain`, `text/csv`). Images,
  fonts, scripts, styles, media, and binary bodies are recorded as one summary line at most.
- Request bodies are never kept (docs/PRIVACY.md). Cookies and authorization headers are never
  stored; other headers pass through secret redaction first.
- Repeated calls to the same method and endpoint (query values removed) are merged into one entry
  with a call count; identical bodies are stored once.

### Size rules

| Rule | Planned value |
|---|---|
| Responses listed per session | 200 (later ones counted, not stored) |
| Body read per response | 1 MB (larger bodies: metadata only) |
| Body kept per response after pruning | about 8 KB |
| Arrays in JSON | first 3 items, then "(+N more)" |
| Strings in JSON | cut at 200 characters; base64 and data URLs removed |
| Nesting depth | 6 levels, deeper parts summarized |

Pruning keeps the shape of the JSON (keys, types, a few sample items), which is usually what an AI
needs to explain the data, and drops the bulk.

### Review and export

- Each response is a context item under a Network data group in the review
  ([context-package](../_systems/context-package.md)), **left out by default**; the user switches
  on the ones that matter.
- Each item shows method, endpoint without query values, status, content type, original size,
  kept size, and how many calls were merged.
- In the package, response data is fenced and labelled as data, like page content.
- Every included response counts against the package budget planned in
  [issue-9 Known Issue 4](../issue-9-context-review/Known_Issues.md).

## Verification / Rollout

To be written with the implementation: a local test site that fires 20 or more requests with
large JSON, images, and repeated calls; checks that only JSON and text are kept, duplicates merge,
bodies are pruned to the limits, secrets are redacted, everything starts left out, and the package
stays within the chosen budget.
