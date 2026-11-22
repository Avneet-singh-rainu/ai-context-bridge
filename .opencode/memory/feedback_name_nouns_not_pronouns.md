---
name: feedback-name-nouns-not-pronouns
description: "Write the actual noun instead of it/they/this/that - pronouns make answers confusing to read"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 753c2b8d-aa6f-4175-94f5-6b527a750de6
  modified: 2026-10-21T05:29:49.993Z
---

Name the thing. Do not write "it", "they", "this", "that", "them", "those" when a noun can be
written instead.

**Why:** Avneet said pronouns confuse him. In answers about this codebase a single paragraph can
mention a stored procedure, a table, a slot, a payer and a run, so "it" could point at any of five
things. The reader then has to stop and work out which one. Naming the noun removes that work.
This sits alongside [[feedback-short-simple-explanations]] - both exist so an answer can be read
once and understood.

**How to apply:**

- Repeat the noun even when repetition feels clumsy. "The sync deletes the link, then the sync
  rebuilds the link" beats "it deletes it, then rebuilds it".
- Worst offenders are the start of a sentence ("This means...", "That is why...") and anything
  following two or more nouns in the previous sentence.
- Use the real name where one exists: `SyncClientPayer`, step 9c, `ClientPayer`, the archive guard
  - not "the procedure", "the statement", "the table", "the guard".
- Pronouns are fine when only one noun is in play and the noun was named in the same sentence.
- Applies to chat answers, commit messages, and the prose in design docs and ADRs.
