# Test Cases - issue-8

**Status of this run:** 2026-11-23. TC1-TC10 passed. TC1-TC9 ran in the Electron dev app and
again in the packaged app (`dist/win-unpacked`), driven through the Chrome DevTools Protocol
against the local test site (`/shop` on 127.0.0.1:8777).

The `/shop` page fires on load: three `/api/orders` pages (about 370 KB of JSON each, with query
values `page` and `token=abc123`), `/api/user` (an API key, a password, a JWT-style token, and an
email), `/api/huge` (1.6 MB), `/api/report.csv` (20 KB), `/api/blob` (base64 and a data URL),
`/api/health` (text), `/api/error` (500), a POST to `/api/search`, `/api/items/1` to `/5`, four
`/api/config?v=N`, one XHR, an image, a script, and `/api/poll` every 400 ms.

## TC1 - Record button and notice

**Steps:** open `/shop`; click Record network.

**Expected:** the button turns red and reads Stop (N) with `aria-pressed="true"`; an info notice
says to reload, with Reload and close buttons; nothing loaded before the click is recorded.

**Result:** passed; 0 entries before the reload.

---

## TC2 - Reload from the notice catches load-time calls

**Steps:** click Reload in the notice; wait 4 seconds.

**Expected:** the page strip shows "Recording · 16 endpoints"; the sidebar footer shows "Network:
recording, 16 endpoints"; the button reads Stop (16).

**Result:** passed; 25 API calls seen, 4 ignored (document, script, image, image fetch).

---

## TC3 - Merging, pruning, and limits

**Expected:**

| Endpoint | Result |
|---|---|
| `GET /api/orders` | 3 calls merged; 364 KB to 2,131 characters; pruned; query keys `page, token` |
| `GET /api/huge` | body not kept; note "larger than 1 MB" |
| `GET /api/report.csv` | 20 KB cut to 8,000 characters at a line break, plus the cut marker |
| `GET /api/blob` | 4.7 KB to 132 characters; base64 and data URL removed |
| `GET /api/config` | 4 calls merged into one entry |
| `GET /api/poll` | call count keeps rising while recording |
| `GET /api/error` | kept with status 500 |
| `POST /api/search` | kept; the request body is not stored |

**Result:** passed; total kept for 16 endpoints is about 11,000 characters.

---

## TC4 - Secrets are redacted in main

**Expected:** `/api/user` shows "3 secrets redacted"; the review box already shows
`[REDACTED]` for `api_key`, `password`, and `session.token`.

**Result:** passed.

---

## TC5 - Responses start left out

**Steps:** click Stop; open Context.

**Expected:** a Network data group with 16 boxes, every switch off; the package has no Network
data section; the page strip reads "16 API endpoints recorded, review in Context".

**Result:** passed.

---

## TC6 - Switch on three responses

**Steps:** switch on `/api/orders`, `/api/user`, and `/api/blob`.

**Expected:** "- Network responses: 3", a `## Network data` section with Response 1 to 3, no API
key, password, token, email, base64, data URL, or `abc123` in the package; the privacy panel
lists "Response 2 (3)" and the email count; the sidebar Context count goes up by 3.

**Result:** passed; the package was 4,216 characters.

---

## TC7 - Edit, Restore, compact, Remove, Clear all

**Expected:** an edit shows in the preview and adds Restore; Restore brings the kept text back;
compact mode lists `## Response N: METHOD endpoint (status)`; Remove drops one box; Clear all
empties the group and resets the counters while the package loses the Network data section.

**Result:** passed.

---

## TC8 - Navigation to another site stops recording

**Steps:** record on `127.0.0.1:8777`; open `localhost:8777/second`.

**Expected:** recording stops; the notice says "Recording stopped: the page moved to another
site."; the button reads Record network again.

**Result:** passed.

---

## TC9 - Close the notice

**Steps:** click the close button on the network notice.

**Expected:** the notice goes away and comes back only for a new notice.

**Result:** passed.

---

## TC10 - Packaged app

**Steps:** `npm run dist`; start `dist/win-unpacked/AI Context Bridge.exe`; repeat TC2-TC9.

**Expected:** same results as the dev app.

**Result:** passed; the same 16 endpoints, sizes, redactions, and package checks as the dev app.
The installer itself was built (about 132 MB) but not installed for this run.
