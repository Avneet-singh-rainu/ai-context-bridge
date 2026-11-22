---
name: feedback-dont-rebuild-db-repeatedly
description: "Don't trigger a full SSDT (.sqlproj) MSBuild rebuild after every small DB schema edit - batch verification instead"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2fc83b20-653f-4b07-a296-f3c727adaf98
  modified: 2026-08-24T11:33:07.937Z
---

Don't kick off a full `CS360Database.sqlproj` MSBuild rebuild after every individual small
schema/SP edit. Batch up DB changes and verify once (or only when a real risk of a build-breaking
mistake exists), not after each column/comment tweak.

**Why:** User explicitly stopped me mid-session ("dont build the db again and again") after I'd
triggered several successive full rebuilds in one sitting (once per small `IsAmbiguous`-column-style
edit) on [[project_c360_25530]] work. The SSDT build is slow (multi-minute - project-model
creation, reference/file loading, interdependency resolution, validation) and repeating it for
every micro-edit is wasted time/noise, not genuine verification discipline.

**How to apply:** Still verify DB changes compile before calling work "done" - just do it once
after a batch of related edits is complete, not as a reflex after each individual Edit call. If
several small schema/SP tweaks are coming in sequence (as in an iterative design conversation),
hold off on rebuilding until the sequence settles, or the user asks to verify.
