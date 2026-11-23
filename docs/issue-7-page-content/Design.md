# issue-7 - Extract active-page DOM content

**Systems:** [page-content](../_systems/page-content.md), [browser](../_systems/browser.md),
[context-package](../_systems/context-package.md)
**Related:** [issue-6](../issue-6-in-app-browser/Design.md) (the browser this reads from),
[issue-5](../issue-5-ocr-export/Design.md) (the package pages join)

## Context / Problem

Milestone 5 adds page text to the context package next to screenshot text. The issue asks for
the page title and URL, visible text and headings, tables where feasible, selected text, source
references, and size limits with user review. Acceptance: browser page content joins screenshot
context with provenance.

## Design

How the script reads the page, the scope and skip rules, the limits, and redaction are in
[Page content](../_systems/page-content.md). This ticket adds:

- **Extract page text** in the Browser view, next to Capture screenshot, with its own capture
  state ("Reading the page...", "Added page text from ...").
- **An isolated-world script** (`page-script.ts`) that walks the rendered DOM of `main`, a single
  `article`, or the body without page chrome, and returns headings, text, list items, code
  blocks, data tables, and the selection as plain data.
- **Checks and redaction in main** (`page-result.ts`): the result is treated as untrusted input,
  limited to `PAGE_LIMITS`, rendered to Markdown, and passed through `redactSecrets` before it
  reaches the renderer. docs/PRIVACY.md makes the redaction a hard rule.
- **Review in Context**: a Browser pages list with stats, editable selected text and page
  content, Restore, and Remove (`PageContentProvider`, `page-store.ts`, `PageEditor.tsx`).
- **A Browser pages section in the package**, with provenance (URL without query, extraction
  time) and the page content fenced and labelled as page data, not instructions.

The decisions behind these choices are in [AI_Decisions.md](AI_Decisions.md).

## Verification / Rollout

[Test_Cases.md](Test_Cases.md) lists the checks. Backing out means removing the `browser:extract`
channel, the page files in `src/main/browser/`, `src/shared/page-content.ts`,
`src/shared/redact.ts`, the page review, and the pages section of the package.
