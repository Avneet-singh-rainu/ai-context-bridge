---
name: feedback-git-network-ops-confirmation
description: "Never run any git operation without explicit per-instance approval and clear warning/alert framing - EXCEPT git add/stage and (since 2026-11-13) read-only status/diff/log/show/branch-list, which are pre-approved. BFF and AgencyWebApp are fully off-limits for git operations, no exceptions."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 85789b18-e2ec-4ff7-b851-0bc46be45a34
  modified: 2026-11-13T07:10:49.682Z
---

Never run **any** git command without the user's explicit go-ahead **each time** - not just fetch/pull/push, but genuinely any git operation (status, log, diff, branch, commit, checkout, everything) - **except `git add`/staging, which the user has explicitly pre-approved to run without asking.**

**Why:** The user first pushed back on unasked `git fetch` calls (I ran one, then proactively queued a second one to compute a PR diff, without asking). When I narrowed the rule to "fetch/pull/push/network operations," the user explicitly broadened it: "not just these three but any git operation." They want full control over every git action, regardless of how routine, read-only, or clearly useful it seems for the task at hand. Later, while working C360-43382, the user explicitly carved out an exception: "for git stage no permission is required u can stage git just stage only" - so staging specifically is exempted from the standing rule, everything else about it still holds. Later still (2026-08-21, C360-25530), when a "stage all changes for this ticket" request led to running `git status` against the AgencyWebApp and BFF repos, the user rejected both and said plainly: "dont do any git operation on bff and agency ever" - a full, blanket ban on those two repos specifically, not just a request to ask first.

**How to apply:**
- **BFF and AgencyWebApp: no git operations of any kind, ever - not even after asking.** This is a repo-level ban, stricter than the general "ask first" rule below. Don't run `git status`/`diff`/`add`/anything against these two repos, and don't ask permission either - just skip them entirely (e.g. when asked to stage "all changes for a ticket," scope the work to the other repos and say so, rather than prompting for approval on BFF/AgencyWebApp).
- For every other repo under Forge: `git add`/staging runs freely, no need to ask first. Still stage specific files by name (never `git add -A`/`.` per the general git safety protocol) so nothing unrelated gets swept in.
- **Read-only git is pre-approved since 2026-11-13** (user picked "Read-only git allowed" when improving the coding environment): `git status`, `git diff`, `git log`, `git show`, `git branch --show-current`, `git branch --list`. These are in the allow list of `Forge/.claude/settings.local.json`. That allow list does NOT know about the BFF/AgencyWebApp ban - still never run even these in those two repos.
- Every other git command (commit, checkout, switch, stash, worktree, push, pull, fetch, reset, merge, rebase, branch create/delete, etc.) still needs a stop-and-ask first, describing exactly what the command will do.
- When asking, use clear warning/alert-style framing (e.g. a "âš ï¸" marker or an explicit "git operation - needs approval" label) so the request stands out from routine questions, per the user's explicit ask for "danger type" alerts on these specifically.
- This applies across all other repos under Forge (Database, Caresmartz360Next, Homecare, mssql-mcp-server, api-mcp-server) and any future ones - BFF and AgencyWebApp are the sole exceptions, and their exception is "never," not "ask first."
