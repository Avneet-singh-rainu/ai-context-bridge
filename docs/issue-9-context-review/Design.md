# issue-9 - Unify context review and export

**Systems:** [context-package](../_systems/context-package.md),
[page-content](../_systems/page-content.md), [screenshots](../_systems/screenshots.md)
**Related:** [issue-5](../issue-5-ocr-export/Design.md) (first package),
[issue-7](../issue-7-page-content/Design.md) (page content and Known Issue 1, fixed here)

## Context / Problem

Milestone 7 brings every source into one review and one reliable package. The issue asks to
normalize screenshots, OCR, DOM, network, tooltips, and user notes, group by source, offer an
editable preview, include and exclude controls, compact and detailed export, and a privacy
review. Acceptance: one reliable context package can be reviewed, trimmed, copied, and saved.

Network capture (M6, issue #8) and tooltip capture are not built yet. The model reserves both
source types so they join the same review when they land.

## Design

The model, review rules, privacy steps, and both package layouts are in
[Context package](../_systems/context-package.md). This ticket adds:

- **One context model**: `collectContextItems` normalizes notes, screenshots with OCR text, and
  browser pages into items with an id, a source, and an included flag; sources keep their own
  stores.
- **Review state in one place**: `ContextReviewProvider` (left-out ids, notes, mode, email
  option, edited package).
- **Grouped review**: Your notes, Screenshots, and Browser pages, each with an include-all box,
  and an Include box on every item.
- **User notes**: Add note; notes go into the package unfenced, as the user's own words.
- **Editable preview**: Edit package text, with a stale banner and Regenerate.
- **Detailed and compact export**, switched in the header.
- **Privacy review**: redaction of every source at export (OCR text included), email hiding on by
  default, redaction of edited text on copy and save, and a panel that shows all of it.

`buildContextMarkdown` remains as a wrapper (detailed, everything included, emails kept), so the
issue-5 to issue-7 package tests still check the detailed layout. The decisions behind these
choices are in [AI_Decisions.md](AI_Decisions.md).

## Verification / Rollout

[Test_Cases.md](Test_Cases.md) lists the checks. Backing out means restoring the issue-7
`ContextWorkspace.tsx` and `context-markdown.ts` and removing the review files.
