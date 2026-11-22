---
name: feedback-understand-ticket-first
description: When starting any new ticket, explain the ticket in plain terms and confirm shared understanding before doing any code/design work
metadata:
  type: feedback
---

Whenever we start work on a new ticket, the first step is always to help the user understand the
ticket - fetch it from Jira, restate the problem in plain language, spell out the expected vs actual
behaviour, and surface anything ambiguous or suspicious (odd labels, missing repro detail,
contradictions). Do not jump straight into code search, design docs, or a fix.

**Why:** Tickets here are often terse, mis-labelled, or written by QA without full context. Building
on a misread ticket wastes a full cycle, and the user wants to validate the interpretation before
any implementation direction gets locked in.

**How to apply:** On "let's start working on <TICKET>": pull the issue via [[reference-jira-mcp-server]],
summarise problem / expected / actual / repro, list open questions and assumptions, then use
`AskUserQuestion` (per [[feedback-use-askuserquestion-popups]]) to confirm the reading and agree the
next step before touching code or creating the `docs/C360-<id>-<slug>/` folder.
