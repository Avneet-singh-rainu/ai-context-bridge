---
name: feedback-remote-branch-first
description: "Avoid creating new branches - ask the user to create the ticket branch on the remote first; only if they say no, create it locally from the repo's base branch"
metadata:
  node_type: memory
  type: feedback
  originSessionId: eb441b8e-ac8d-4cd5-87ea-209f8f482a16
  modified: 2026-11-13T07:47:27.823Z
---

When a ticket branch does not exist locally or on origin, do not create it. Ask the user
(AskUserQuestion) to create it on the remote first. On yes, wait, `git fetch origin`, and check out
a local branch tracking `origin/<TICKET>`. Only if the user says no, create it locally from that
repo's base branch ([[project-repo-base-branches]]).

**Why:** 2026-11-13 the user said: "try to avoid making new branches ask me to create the branch on
remote first i will create them on remote if i say no then u can create from the respective parents
or base".

**How to apply:** every branch-creating path - the ticket-worktree skill, the homecare-stage-ticket
skill, and any ad hoc `checkout -b`. A branch that exists only on origin is checked out with
tracking, which is not "making a new branch". Git approval rules still apply
([[feedback-git-network-ops-confirmation]]).
