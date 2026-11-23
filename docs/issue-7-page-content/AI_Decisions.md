# AI Decisions - issue-7

Claude picks first and logs the pick here before acting; the user answers in a quiz at the end of
the turn. Never change a logged pick to match the answer. Two points are settled elsewhere and not
quizzed: the extraction script runs in an isolated world (architecture pick), and secret patterns
are redacted in main before the text leaves it (a hard rule in docs/PRIVACY.md).

## D1 - Which part of the page is extracted

- Claude: the rendered content of `<main>` (or `role="main"`), or of a single `<article>`, when the page has one; otherwise the body without `nav`, `header`, `footer`, `aside`, and navigation landmarks. Hidden and `aria-hidden` elements are skipped. The whole page counts, not only the part on screen.
- Why: menus, cookie bars, and footers repeat on every page and waste the chat's context; most sites mark their content with `main` or `article`; text below the fold is still part of the page the user is looking at.
- You: Only what is on screen
- Result: Wrong. Most of an article or a long table sits below the fold, and the result would change with window size and scroll position; menus and banners on screen would still get in. Fair point: it matches what the user sees, like a screenshot, which can suit dashboards.
- Acted on: none - Claude pick kept

## D2 - Size limits

- Claude: at most 50,000 characters of page content, cut at a block boundary; at most 20 tables of 100 rows and 15 columns, with cells cut at 300 characters; selected text up to 10,000 characters; at most 10 pages in the package. Every cut is shown in the review and in the package.
- Why: 50,000 characters is roughly 12,000 tokens, enough for an article while leaving room in a free chat's context; cutting at a block keeps sentences whole; saying so avoids pretending the page was complete.
- You: No limit
- Result: Wrong. Some pages are megabytes (feeds, logs); that slows the renderer, breaks the 5 MB save limit, and overflows a free chat, which cuts silently. Fair point: no surprise cuts; the user decides what to trim.
- Acted on: none - Claude pick kept

## D3 - How the user reviews page content

- Claude: each extracted page appears in Context with its stats (size, headings, tables, redactions, cuts) and two editable boxes, selected text and page content, plus Restore and Remove. What was extracted is in the package unless the user removes or empties it.
- Why: the same pattern as OCR text, so there is one way to review; editing lets the user drop noise the rules missed; nothing joins the package without a click on Extract page text first.
- You: Editable boxes per page
- Result: Right - same as the Claude pick.
- Acted on: none - Claude pick kept

## D4 - How page text appears in the package

- Claude: inside a fenced block, under a line that says the text is quoted from the page as data, not instructions.
- Why: web pages can contain text written to steer an AI ("ignore your instructions..."); fencing and labelling it tells the reader model where page data starts and stops, and keeps page Markdown from breaking the package layout.
- You: Plain Markdown inline
- Result: Wrong. Page text is untrusted: inline, a page heading such as "## Missing information" looks like part of the package, and "ignore your instructions" text reads like the user's own request. Fair point: headings and tables render nicely in chats that show Markdown.
- Acted on: none - Claude pick kept
