# Page content

Facts about **Extract page text** that stay true after issue-7 closes. Main-process code lives in
`src/main/browser/` (`page-script.ts`, `page-extract.ts`, `page-result.ts`); shared rules live in
`src/shared/page-content.ts` and `src/shared/redact.ts`; the review lives in
`src/renderer/src/features/context/`.

## Flow

1. **Extract page text** in the Browser view calls `browser:extract`.
2. Main runs `EXTRACT_SCRIPT` with `executeJavaScriptInIsolatedWorld` (world 1001). The isolated
   world shares the page's DOM but not its JavaScript, so page scripts cannot replace
   `getComputedStyle` or other functions to hide or fake content. Timeout: 15 seconds.
3. If the page navigated while the script ran, the result is dropped.
4. `sanitizeExtraction` checks the result as untrusted input: block types, lengths, table sizes.
5. `buildPageExtract` renders Markdown (`blocksToMarkdown`) and runs `redactSecrets` on the
   Markdown, the selection, and the title, all before the text leaves main.
6. The renderer adds the page to `PageContentProvider` (at most 10 pages) and shows it in Context.

## What the script reads

- **Scope:** `<main>` or `role="main"` when it has at least 200 characters of rendered text;
  otherwise a single `<article>` with at least 200 characters; otherwise `<body>`.
- **Skipped everywhere:** `nav` and `role="navigation"`, hidden elements (`display: none`,
  `visibility: hidden`, no layout box), `aria-hidden="true"`, 1-pixel screen-reader-only text,
  and script, style, form controls, images, media, canvas, SVG, and iframes.
- **Skipped when the scope is the body:** `aside`, landmark roles (banner, contentinfo,
  complementary, search), and `header` or `footer` outside an article, section, or main.
- **Kept, in page order:** headings (`#` to `######`), text blocks, list items (nested lists
  indented), `pre` blocks (fenced), and data tables. A table is a data table unless it has
  `role="presentation"` or `role="none"`, or has no `th` and fewer than two columns.
- **Selected text:** `window.getSelection()`, kept separate from the page content.
- The whole rendered page counts, not only the part on screen.

## Limits (`PAGE_LIMITS`)

| Limit | Value |
|---|---|
| Page content | 50,000 characters, cut before the first block that would go over |
| Tables | 20 per page, 100 rows, 15 columns, 300 characters per cell |
| Text block | 20,000 characters |
| Selected text | 10,000 characters |
| Title | 500 characters |
| Pages in the package | 10 |

The script also stops after visiting 40,000 elements. Any cut sets `stats.truncated`, which the
review and the package both show.

## Redaction (`redactSecrets`)

docs/PRIVACY.md requires common secret patterns to be redacted before persistence and export.
Patterns: private key blocks, AWS access key ids, GitHub, Slack, Google, and Stripe keys,
OpenAI-style `sk-` keys, JSON Web Tokens, `Bearer` tokens, and labelled values such as
`password: ...`, `api_key=...`, `client_secret=...`, and `token: ...` (8 or more characters; the
label stays). Each match becomes `[REDACTED]` and is counted in `stats.redactions`. The list is
fixed, so unusual secret formats can slip through.

## Review

Each page shows its title, export URL, read time, size, heading and table counts, redactions,
and cuts, with two editable boxes (selected text, page content), **Restore**, and **Remove**.
Everything extracted goes into the package unless the user removes or empties it. See
[Context package](./context-package.md) for how pages appear in the export.
