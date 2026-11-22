---
name: feedback-worktree-deletion
description: Never remove a ticket worktree without the user approving that exact folder; refuse if it has uncommitted changes or unpushed commits
metadata:
  node_type: memory
  type: feedback
  originSessionId: eb441b8e-ac8d-4cd5-87ea-209f8f482a16
  modified: 2026-11-13T07:43:48.893Z
---

Never remove a git worktree (`Forge\wt\<TICKET>\<repo>`) unless the user approves that exact folder
in an AskUserQuestion. A yes for one folder is not a yes for another; never offer "remove all".
Even with a yes, run the safety check first (`git status --porcelain` and unpushed `git log`) and
refuse if either shows anything. Never `--force`, never `rm -rf`, never delete the branch.

**Why:** 2026-11-13, when setting up worktrees the user said: "i want to be very sure of the WT
deletion so dont delete any wt without asking me". A worktree can hold the only copy of
uncommitted work.

**How to apply:** Cleanup is only ever offered, at the start of a new ticket, for worktrees whose
ticket.yaml says Shipped - one question per worktree. Full procedure in the
`.claude/skills/ticket-worktree` skill. Related: [[feedback-git-network-ops-confirmation]],
[[project-repo-base-branches]].
