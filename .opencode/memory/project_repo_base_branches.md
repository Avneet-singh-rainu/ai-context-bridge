---
name: project-repo-base-branches
description: "Which origin branch new ticket branches are cut from, per repo - Database Prod, HomeCare-CS360 and Caresmartz360Next Production"
metadata:
  node_type: memory
  type: project
  originSessionId: eb441b8e-ac8d-4cd5-87ea-209f8f482a16
  modified: 2026-11-13T07:43:52.088Z
---

New ticket branches are cut from:
- Database: `origin/Prod` (see [[feedback-database-repo-branch-base]])
- HomeCare-CS360: `origin/Production` (homecare-stage-ticket skill)
- Caresmartz360Next: `origin/Production` - confirmed by the user 2026-11-13. An older note said
  "other repos use Development"; that is superseded for Next.
- BFF, AgencyWebApp: no git at all.

**Why:** needed to create per-ticket worktrees from the right base ([[feedback-worktree-deletion]]).

**How to apply:** use these when creating a ticket branch or worktree; if a new repo appears, ask.
