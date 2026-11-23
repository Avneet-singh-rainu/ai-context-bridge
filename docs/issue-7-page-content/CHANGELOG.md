# Changelog - issue-7

## 2026-11-23

- `src/main/browser/page-script.ts` - extraction script for an isolated world (1001): scope
  `main`, a single `article`, or the body without page chrome; skips hidden, `aria-hidden`, and
  screen-reader-only text; returns headings, text, list items, `pre` blocks, data tables, and the
  selection.
- `src/main/browser/page-extract.ts` - runs the script with a 15-second timeout and drops the
  result if the page navigated meanwhile.
- `src/main/browser/page-result.ts` - checks the script's result as untrusted input, applies
  `PAGE_LIMITS`, renders Markdown, and redacts secrets before the text leaves main.
- `src/shared/page-content.ts` - block types, `PAGE_LIMITS`, and `blocksToMarkdown` (tables with
  escaped pipes, nested lists, fenced code, cut at a block boundary).
- `src/shared/redact.ts` - `redactSecrets` for private keys, cloud and API token formats, JSON
  Web Tokens, bearer tokens, and labelled values such as `password:`.
- `src/shared/ipc-contract.ts`, `src/preload/index.ts`, `src/main/ipc.ts`,
  `src/main/browser/browser-view.ts` - the `browser:extract` channel.
- `src/renderer/src/features/context/page-store.ts`, `PageContentProvider.tsx`, `PageEditor.tsx`,
  `ContextWorkspace.tsx`, `src/renderer/src/App.tsx` - Browser pages review with stats, editable
  selection and content, Restore, and Remove; at most 10 pages.
- `src/renderer/src/features/browser/BrowserProvider.tsx`, `BrowserWorkspace.tsx` - **Extract
  page text** button and its capture state.
- `src/renderer/src/features/export/context-markdown.ts` - Browser pages section, page notes,
  missing-information lines, and source references; the Screenshots heading and OCR warnings now
  appear only when there are screenshots.
- `src/renderer/src/styles.css` - page review styles.
- `tests/unit/redact.test.ts`, `page-content.test.ts`, `page-store.test.ts`,
  `context-markdown.test.ts` - 15 new unit tests; 75 in total.
