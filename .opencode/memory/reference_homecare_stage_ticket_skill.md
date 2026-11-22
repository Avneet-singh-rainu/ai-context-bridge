---
name: reference-homecare-stage-ticket-skill
description: A project skill exists at .claude/skills/homecare-stage-ticket/SKILL.md for branching+staging Homecare-CS360 ticket work off origin/Production
metadata: 
  node_type: memory
  type: reference
  originSessionId: f2ead83b-c588-4bd6-ae22-e8a5f2f8d7df
  modified: 2026-08-25T07:43:12.836Z
---

`D:\Projects\ai-context-bridge\.claude\skills\homecare-stage-ticket\SKILL.md` - invoke (or recognize) this
when the user says something like "stage this/that/something" for work just done in the
conversation on the Homecare-CS360 repo. It creates/checks out a branch named after the current
ticket off `origin/Production`, brings the ticket's changes onto it (redoing edits fresh against
current file state if needed), and stages them.

**Why it exists:** Built after repeatedly hand-running this exact sequence for C360-42875 - the
user wanted it turned into a repeatable procedure rather than redone manually each time.

**Key constraint it encodes:** [[feedback_git_network_ops_confirmation]] still applies in full -
the skill still asks for one consolidated, alert-framed approval per invocation before running any
git command beyond staging. Invoking the skill by name is not itself git approval - the user was
explicit about this when the skill was designed.
