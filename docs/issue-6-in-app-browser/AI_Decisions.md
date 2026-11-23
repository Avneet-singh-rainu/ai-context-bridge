# AI Decisions - issue-6

Claude picks first and logs the pick here before acting; the user answers in a quiz at the end of
the turn. Never change a logged pick to match the answer. The embedding (a `WebContentsView` with
its own `persist:browser` session) was settled earlier and is not repeated here.

## D1 - What happens when the user types words instead of a web address

- Claude: search for the words on DuckDuckGo (`https://duckduckgo.com/?q=...`); text that looks like a host (has a dot, or is localhost or an IP) opens as a site instead.
- Why: every browser does this, so the user expects it; DuckDuckGo does not build a profile from searches; an error for plain words would feel broken.
- You: Search on DuckDuckGo
- Result: Right - same as the Claude pick.
- Acted on: none - Claude pick kept

## D2 - What the browser does with popups, other schemes, downloads, and permission requests

- Claude: only http and https pages load; a popup or `target="_blank"` link opens in the same view; downloads are cancelled with a message; every permission request (camera, microphone, location, notifications) is denied.
- Why: one view and one active page keeps capture simple (the handoff captures the active page only); `file:` and custom schemes could read local files or launch apps; downloads and permissions are not needed to browse and capture.
- You: Allow like Chrome
- Result: Wrong. Electron has no permission prompt: without a handler it grants every request, so "prompt" would really mean camera and location allowed silently. New popup windows would escape the one-view rules and break active-page-only capture, and downloads would write files the app never asked for. Fair point: OAuth sign-in popups that rely on window.opener can break when opened in the same view.
- Acted on: none - Claude pick kept

## D3 - Where a page capture goes

- Claude: `webContents.capturePage()` makes a PNG of the visible page in main; the renderer turns it into a file and adds it to the same screenshot list through the same import checks, keeping the page title and URL as its source.
- Why: a capture then gets OCR, editing, and export for free; the checks stay in one place; the source keeps provenance for the context package.
- You: Into Screenshots list
- Result: Right - same as the Claude pick.
- Acted on: none - Claude pick kept

## D4 - How the page URL appears in the context package

- Claude: origin and path only; the query string and fragment are removed (`https://shop.example/orders?id=7&token=abc` becomes `https://shop.example/orders`).
- Why: query strings often carry session tokens, emails, or ids that should not be pasted into an AI chat; origin and path still say which page it was.
- You: Full URL
- Result: Wrong. Query strings often carry session tokens, reset links, emails, and ids, and the package is pasted into a third-party AI chat. Fair point: some pages are only identified by their query (search results, ?id=7); a later per-package option could keep it.
- Acted on: none - Claude pick kept
