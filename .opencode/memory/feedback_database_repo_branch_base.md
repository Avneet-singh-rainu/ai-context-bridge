---
name: feedback-database-repo-branch-base
description: "For the Database repo specifically, always create new ticket branches off prod, not Development"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f2ead83b-c588-4bd6-ae22-e8a5f2f8d7df
  modified: 2026-08-19T12:15:31.037Z
---

For the `Database` repo, new ticket branches must always be created off the **prod** branch, not
`Development`.

**Why:** When asked to approve branching for C360-28571 (which needed edits in the Database repo:
`Reports\Views\rpt_CaregiverHR.sql`, `Stored Procedures\Procs1\ActiveCaregiverswithHireandRates.sql`),
the user corrected the default suggestion of branching off `Development` (the pattern used for
other repos, e.g. `Homecare-CS360` on [[project_c360_42875]]-style tickets) with: "always branch
off from prod for database".

**How to apply:** Whenever a task requires creating a new branch in the `Database` repo
specifically, default to basing it on `prod` (verify the exact branch name/casing exists via
`git branch -a` before checking out - don't assume). This is scoped to the `Database` repo only;
other repos (`Homecare-CS360`, `Caresmartz360Next`, `AgencyWebApp`, `BFF`, etc.) have no confirmed
override and should keep using `Development` unless told otherwise. Still follows
[[feedback_git_network_ops_confirmation]] - every git command needs per-instance approval except
`git add`/stage.
