---
name: project-clientpayer-null-rows-are-not-orphans
description: ClientPayer rows with ClientId = NULL are live scheduling data linked to schedule slots - never call them orphans/garbage and never propose deleting them
metadata:
  node_type: memory
  type: project
  originSessionId: 753c2b8d-aa6f-4175-94f5-6b527a750de6
  modified: 2026-10-09T07:25:05.827Z
---

`ClientPayer` rows with `ClientId = NULL` are **not orphans, not leftovers, not garbage, and not
safe to delete.** Each one is the payer row for a specific schedule slot, linked through
`SchedulePayer.ClienPayerId`, and scheduling reads them. On AbbeyCare that is ~4.6M of the table's
~5.2M rows - it is the data model, not bloat.

**Why:** Avneet has stated this several times, most recently 2026-10-09 after I repeatedly described
them as orphans and quoted a "~2.8M rows safely deletable" figure in C360-38441 docs. The design is
one `ClientPayer` row per payer per slot; a NULL `ClientId` marks it as slot-scoped rather than
client-scoped.

**How to apply:** Never propose deleting them, and never frame `ClientPayer` size as a cleanup
problem. The performance fixes must work *with* the table at full size - a filtered index on
`WHERE ClientId IS NOT NULL ...` (~5,149 rows), or rewriting the per-slot correlated lookup in
`updateAuthAndModifierUponSyncPayerForSingleClient` to read the client's payers once. See
[[feedback-verify-hardcoded-values]] and [[feedback-cascade-doc-updates]] - when this was corrected,
every doc that called them orphans had to be swept, not just the obvious one.
