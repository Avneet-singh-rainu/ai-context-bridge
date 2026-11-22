---
name: feedback-cascade-doc-updates
description: "When a decision changes on a ticket, sweep every doc in that ticket's folder that referenced the old decision, not just Decisions.md/Design.md"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2fc83b20-653f-4b07-a296-f3c727adaf98
  modified: 2026-08-20T07:58:07.257Z
---

Whenever a decision on a ticket changes (a scope change, a reversed call, a correction to an
earlier design), update ALL docs in that ticket's `docs/<TICKET>/` folder that referenced the
old decision - not just the 1-2 most obvious files (usually Decisions.md/Design.md).

**Why:** On C360-25530, the 2026-08-20 no-revert scope change (QBO sync failures log instead of
reverting) was correctly propagated into Decisions.md (ADR-004 amendment) and Design.md, but
`Data_Engineering_Request.md` - which described the old `Invoice_RevertCreditAdjustment` SP and
a `BulkCreditAdjustmentQBOQueue.IsProcessed` comment reading "failed-and-reverted" - was missed
entirely and stayed stale until caught later during a grooming-prep review, not at the time the
decision changed. The user explicitly called this out: "update the docs each time we make any
decision."

**How to apply:** immediately after updating the primary decision-tracking docs (Decisions.md,
Design.md), grep/search across the OTHER files in the same ticket folder
(`Test_Cases.md`, `Data_Engineering_Request.md`, `API_Contracts.md`, `known-issues/`,
`open-questions/`) for anything that referenced the thing that just changed (a SQL object name,
a mechanism, a specific value) - don't assume the primary docs were the only place it was
mentioned. This is now also CLAUDE.md rule 9's explicit text, not just a memory note.
