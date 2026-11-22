---
name: feedback-list-changed-files
description: "End every message that changed anything on disk with the list of files created, modified or deleted"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 753c2b8d-aa6f-4175-94f5-6b527a750de6
  modified: 2026-10-05T08:13:32.960Z
---

Every reply that changed anything on disk ends with the files touched - created, modified or
deleted - grouped by repo when more than one is involved, and saying which are staged. One line per
file, no prose wrapped around it. Include docs, config and generated artefacts, not just source.
When nothing changed, say so rather than omitting the list.

**Why:** Pawan asked for this on 2026-10-05 after a session where work spanned four repos plus an
untracked `docs/` folder, and tracking what had moved meant re-reading the conversation. Side-effect
changes are the ones that matter most - during that session `git add BLL` swept 45 build artefacts
into the index, and an unrelated `Client/Startup.cs` edit was sitting in the working tree. A
standing file list catches both before they reach a commit.

**How to apply:** treat it as part of the reply, not an optional summary - its absence should never
need interpreting. Also recorded as CLAUDE.md rule 19, which is the copy that travels with the repo;
this memory is the backstop for when that file is not loaded. See
[[feedback-db-deployment-script-drift]] for the other rule that exists in both places.
