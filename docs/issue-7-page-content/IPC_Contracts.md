# IPC Contracts - issue-7

## browser:extract

**Direction:** renderer -> main (invoke)
**Preload API:** `window.bridge.browserExtract()`
**Main handler:** `extractPage` in `src/main/browser/browser-view.ts`, which calls `readPage` in
`src/main/browser/page-extract.ts`

### Payload

None. Main reads the active page only.

### Result - success

```ts
type PageExtractResponse = { ok: true; page: PageExtract } | { ok: false; error: string };

interface PageExtract {
  url: string; // full URL; the package shows origin and path only
  title: string; // redacted, at most 500 characters
  extractedAt: string; // ISO 8601
  selection: string; // redacted, at most 10,000 characters
  markdown: string; // redacted, at most 50,000 characters
  stats: {
    characters: number;
    headings: number;
    tables: number;
    redactions: number;
    truncated: boolean; // anything was cut
    scope: 'main' | 'article' | 'body';
  };
}
```

The script's raw result never reaches the renderer: `sanitizeExtraction` checks it and
`buildPageExtract` renders and redacts it in main.

### Result - errors

| Condition | What the caller receives |
|-----------|--------------------------|
| No page open | `{ ok: false, error: 'Open a page first.' }` |
| The page is still loading | `{ ok: false, error: 'Wait for the page to finish loading.' }` |
| Not an http or https page | `{ ok: false, error: 'Only http and https pages can be read.' }` |
| The script throws or takes over 15 seconds | `{ ok: false, error: 'The page content could not be read: ...' }` |
| The page navigated during the read | `{ ok: false, error: 'The page changed while it was being read. Try again.' }` |
| The result is not an object with blocks | `{ ok: false, error: 'The page content could not be read.' }` |

The renderer also refuses an 11th page: "The limit of 10 pages is reached. Remove one in Context
first."
