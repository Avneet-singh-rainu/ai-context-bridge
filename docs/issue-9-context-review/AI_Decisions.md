# AI Decisions - issue-9

Claude picks first and logs the pick here before acting; the user answers in a quiz at the end of
the turn. Never change a logged pick to match the answer.

## D1 - How the unified context model relates to the existing stores

- Claude: each source keeps its own store (screenshots and OCR text, browser pages); a pure `collectContextItems` step turns them into one ordered list of context items with a common shape (id, source, included); a new review store holds only review state: what is left out, user notes, export mode, email hiding, and an edited copy of the package. Network and tooltip are reserved source types for M6 and hover capture.
- Why: the sources already work and are tested; normalizing on read means one list for grouping, counting, and export without copying data or keeping two copies in sync; new sources only need a converter.
- You: One big new store
- Result: Wrong. It rewrites three tested stores (screenshots, OCR text, pages) for no new behaviour, and mixes source data with review state, so every capture and every checkbox go through one large reducer. Fair point: a single store is easier to save and restore as a session later, and needs no id prefixes.
- Acted on: none - Claude pick kept

## D2 - How include and exclude work

- Claude: a checkbox on every item and an include-all checkbox on every group; left-out items stay in the review, dimmed and still editable, and are dropped from the preview, the counts, and the export; new items start included.
- Why: trimming must be reversible, so nothing is deleted; dimming keeps the user's place; including by default means nothing the user just extracted goes missing silently.
- You: Delete to exclude
- Result: Wrong. Trimming would not be reversible: deleting a screenshot throws away its OCR text and edits, so trying a smaller package means importing and extracting again. Fair point: fewer states and a simpler review.
- Acted on: none - Claude pick kept

## D3 - What "editable preview" means

- Claude: the preview is generated from the sources; Edit package text turns it into an editable copy that stops following source changes; a banner says when sources or options changed after the edit, with Regenerate to drop the edits; copy and save use the edited copy, with secret redaction run again.
- Why: editing the sources keeps everything structured, but some trims (reordering, cutting a sentence across sections) are only possible on the final text; freezing the edit avoids silently losing it, and the banner avoids silently exporting stale text.
- You: Always editable live
- Result: Wrong. Any source change, even the email option, would regenerate the text and silently overwrite the user's edits. Fair point: the preview can never be stale.
- Acted on: none - Claude pick kept

## D4 - What the privacy review does

- Claude: the export redacts secret patterns in every source, screenshot OCR text included (closing issue-7 Known Issue 1); a privacy panel above the preview shows how many items are left out, each redaction by item, how many email addresses were found with a Hide email addresses option that is on by default, and that page links carry no query strings.
- Why: docs/PRIVACY.md forbids exporting secrets from any source; email addresses are personal data the user may still need, so they are hidden by default but can be kept; one panel lets the user check everything right before copying.
- You: Redact all + panel
- Result: Right - same as the Claude pick.
- Acted on: none - Claude pick kept
