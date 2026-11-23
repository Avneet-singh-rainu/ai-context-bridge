# AI Decisions - issue-8

Claude picks first and logs the pick here before acting; the user answers in a quiz at the end of
the turn. Never change a logged pick to match the answer. The size rules (200 entries, 1 MB read,
about 8 KB kept, 3 array items, 200-character strings, depth 6) come from Design.md.

## D1 - What starts and stops recording

- Claude: a Record network button on the active page starts it; the page is not reloaded automatically (a notice says to reload to catch requests made while the page loads); recording stops on Stop, on navigation to a different site (origin), or if the debugger is detached; kept responses stay until the user clears them.
- Why: an explicit start and stop with a visible indicator is a PRIVACY.md rule; an automatic reload could resubmit a form or lose what the user typed; a new site is a new active page, so the session ends there.
- You: Button, no reload
- Result: Right - same as the Claude pick.
- Acted on: none - Claude pick kept

## D2 - Which responses are kept

- Claude: XHR, Fetch, and Other requests with JSON (`application/json`, `+json`) or text (`text/plain`, `text/csv`) content; bodies read only up to 1 MB; calls with the same method and endpoint are merged, keeping the newest body and a call count; headers are never stored; query values are dropped and only query key names are kept.
- Why: API data lives in XHR and Fetch responses; documents, scripts, images, and fonts add noise or are already covered by Extract page text; merging turns 20 polling calls into one entry; headers carry cookies and tokens, and query values often carry ids and tokens.
- You: API JSON/text, merged
- Result: Right - same as the Claude pick.
- Acted on: none - Claude pick kept

## D3 - How a big response is reduced

- Claude: JSON is pruned by structure first (arrays keep 3 items plus "(+N more items)", strings cut at 200 characters, base64 and data URLs removed, nesting past depth 6 summarized), then capped at 8,000 characters; text is cut at a line boundary; secrets are redacted after pruning.
- Why: the shape of the data (keys, types, a few sample rows) is what an AI needs to explain it; cutting raw text at a byte limit often breaks the JSON in the middle; pruning keeps it valid and readable.
- You: Full body, user trims
- Result: Wrong. The size problem moves onto the user: a 370 KB orders body becomes a 370 KB text box to trim by hand, hand cuts usually break the JSON, and switching on a few responses would still overflow a free chat. Fair point: nothing is lost before the user sees it.
- Acted on: none - Claude pick kept

## D4 - Whether responses start included

- Claude: every response starts left out; the user switches on the ones that matter in Context, where each shows its size before and after pruning.
- Why: a page can fire dozens of calls; including them all by default would flood the package and the chat's context; screenshots, pages, and notes are deliberate actions, network calls are not.
- You: All included
- Result: Wrong. Network calls are not a deliberate user action like a screenshot or an extracted page: 16 endpoints from one page would all go into the package at once, pushing it past a free chat's limit and sending data the user never looked at. Fair point: one fewer click when every response matters.
- Acted on: none - Claude pick kept
