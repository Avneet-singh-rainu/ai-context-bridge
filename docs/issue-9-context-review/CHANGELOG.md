# Changelog - issue-9

## 2026-11-23

- `src/renderer/src/features/context/context-model.ts` - the unified model: `ContextItem`,
  `collectContextItems`, `groupItems`, source order and labels, with network and tooltip
  reserved. `PackageScreenshot` and `PackagePage` moved here.
- `src/renderer/src/features/context/review-store.ts`, `ContextReviewProvider.tsx` - review
  state: left-out items, notes, detailed or compact mode, email hiding, edited package.
- `src/renderer/src/features/export/context-markdown.ts` - `renderContextPackage` with detailed
  and compact layouts, left-out items dropped and numbering without gaps, a User notes section,
  redaction of every source at export, email hiding, and a privacy report.
  `buildContextMarkdown` is now a wrapper over it.
- `src/shared/redact.ts` - `hideEmails` and `countEmails`.
- `src/renderer/src/features/context/ContextWorkspace.tsx`, `ContextGroupBlock.tsx`,
  `ContextItemEditors.tsx`, `PrivacyReview.tsx`, `PackagePreview.tsx`, `PageEditor.tsx` - grouped
  review with include boxes, notes, privacy panel, mode switch, and editable preview with a stale
  banner; edited text is redacted again on copy and save.
- `src/renderer/src/App.tsx`, `src/renderer/src/styles.css` - review provider and styles.
- `docs/issue-7-page-content/Known_Issues.md` - Known Issue 1 (OCR text not redacted) marked
  fixed.
- `tests/unit/review-store.test.ts`, `context-package.test.ts`, `redact.test.ts` - 14 new unit
  tests; 89 in total.
