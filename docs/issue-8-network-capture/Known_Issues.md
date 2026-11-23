# Known Issues - issue-8

## 1. Ids in the path make separate endpoints

**Status:** Accepted gap

**Found:** 2026-11-23

**What happens:** calls merge only when the method and the full path match. `/api/items/1` to
`/api/items/5` become five entries, each with one call.

**Why it was not fixed here:** guessing which path parts are ids (numbers, UUIDs, slugs) can merge
calls that are really different. Each entry is small and starts left out, so the cost is a longer
list, not a bigger package.

**Planned fix:** merge path segments that are numbers or UUIDs into `:id`, and show the call count.

## 2. The review boxes show email addresses

**Status:** Accepted by design

**Found:** 2026-11-23

**What happens:** secrets are redacted in main before the renderer sees the body, but email
addresses stay visible in the review box. The preview, clipboard, and saved file hide them while
Hide email addresses is on.

**Why it was not fixed here:** same rule as OCR text in
[issue-9 Known Issue 2](../issue-9-context-review/Known_Issues.md): one export step hides emails
for every source, and the user can turn hiding off.

## 3. No package size budget yet

**Status:** Accepted gap - planned in issue-9

**Found:** 2026-11-23

**What happens:** each response is capped at 8,000 characters, but switching on many responses
can still make a package too large for a free chat. In the test, all 16 endpoints together kept
about 11,000 characters; the worst case is 200 endpoints at 8,000 characters each.

**Why it was not fixed here:** the budget covers every source and is planned in
[issue-9 Known Issue 4](../issue-9-context-review/Known_Issues.md). Responses start left out and
each box shows its kept size, which keeps the default safe.

## 4. Some traffic is not recorded

**Status:** Accepted gap

**Found:** 2026-11-23

**What happens:** WebSocket messages, server-sent event streams, and other bodies that never
finish loading are not kept. When Chromium cannot return a body, the entry keeps its details with
the note "The body was not available"; an API request that fails to load is only counted as
failed. Requests made before Record network was clicked are missed until the page is reloaded.

**Why it was not fixed here:** the Network domain path covers request and response pairs; streams
need their own events and size rules. The reload notice covers the load-time case.
