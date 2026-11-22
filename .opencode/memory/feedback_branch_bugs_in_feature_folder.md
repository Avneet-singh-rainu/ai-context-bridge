---
name: feedback-branch-bugs-in-feature-folder
description: "Jira 'Branch Bug' tickets found while testing a feature go inside that feature's own docs folder, not a separate folder"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2fc83b20-653f-4b07-a296-f3c727adaf98
  modified: 2026-09-30T08:00:00.856Z
---

When a Playwright/QC suite testing feature ticket X finds a bug and files it as its own Jira
ticket (issue_type "Branch Bug"), do NOT create a separate `docs/C360-<bug-id>-.../` folder for
it. Document it inside the feature ticket's own existing folder instead - a CHANGELOG.md entry,
an ADR under `adr/` for the actual fix decision, and a `Data_Engineering_Request.md` update if it
needs an environment/config hand-off.

**Why:** corrected in-session (2026-09-30) after creating separate folders for C360-47980 and
C360-47986 (both Branch Bugs found by C360-25530's Playwright suite) - user said these are
"feature bugs," meaning bugs that belong conceptually to the feature ticket, not independent work
items, and should be tracked inside the main ticket's own docs instead of scattered across
several small folders.

**How to apply:** before creating a new ticket folder, check the Jira issue's `issue_type`. If
it's "Branch Bug" (or the description says "found by the <ticket> Playwright suite" / similar
phrasing tying it to an existing feature ticket), document it inside that feature ticket's folder:
- CHANGELOG.md entry (root cause, fix, files, verify line) - same as any other change.
- A new ADR under `adr/` if the fix involved a real decision (which fix approach, why not the
  alternative) - not just a one-line bug.
- `Data_Engineering_Request.md` update only if it needs an actual environment/config hand-off.
- Do NOT create `ticket.yaml`/a new folder for it, and do NOT cross-link it from
  `Known_Issues.md` as if it were a separate tracked ticket - just document it directly.

A genuinely independent bug (not tied to a specific feature branch's own testing, no "Branch Bug"
type, reported against already-shipped functionality unrelated to a specific ticket) still gets
its own folder per the normal rule.

Related: [[reference_repo_structure]].
