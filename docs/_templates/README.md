# Templates

Copy these into a new ticket folder. Delete every `<!-- guidance -->` comment as you fill them in.

Ticket folder name: `docs/issue-<id>-<kebab-slug>/`
Example: `docs/issue-3-screenshot-import/`

## Pick a tier first

| Tier | When | Files to copy |
|------|------|---------------|
| **1 - Trivial** | One file touched, no design choice, under a day | `ticket.yaml`, `CHANGELOG.md` |
| **2 - Standard** | Normal bug or small feature | `ticket.yaml`, `Tier2_Design.md` -> `Design.md`, `CHANGELOG.md`, `Test_Cases.md` |
| **3 - Heavy** | Epic, multi-ticket, or architectural | `ticket.yaml`, `Tier3_HLD.md` -> `HLD.md`, `Tier3_LLD.md` -> `LLD.md`, `adr/`, `CHANGELOG.md`, `Test_Cases.md` |

Add the conditional files only when the ticket actually has something for them to hold:
`Open_Questions.md`, `Known_Issues.md`, `IPC_Contracts.md`, `Corrections.md`, `scratchpad/`.

Every **bug** ticket, any tier, also copies `Replication.md`: how to make the bug happen again, the
result before and after the fix, and the evidence that shows the difference. Features skip it.

## The two rules that matter most

**1. A fact that stays true after this ticket closes belongs in `docs/_systems/`, not here.**
Link to it instead of re-explaining it. If the `_systems/` doc is missing or wrong, fix it there
first, then link. For Tier 3 the ticket is not done until every `_systems/` doc it touched
reflects the new reality.

**2. Design docs are present tense, current state only.**
Disproved theories and superseded approaches get deleted, or moved to a `## Superseded` section at
the bottom. Never leave them sitting ahead of the answer. History lives in `CHANGELOG.md`.

## HLD vs LLD (Tier 3)

The boundary is not stylistic. It is what stops the two files duplicating and then diverging.

- **`HLD.md`** - no code, no schemas, no method signatures, no file paths.
- **`LLD.md`** - the only file containing anything implementable. If it is copy-pasteable into a
  source file, it belongs here and nowhere else.

Cross-reference between them by heading name, never by step number. Step numbers get renumbered
and the references go stale silently.

## Conventions

- Hard-wrap Markdown at ~100 characters so line diffs stay reviewable.
- Plain dashes, never em dashes.
- `ticket.yaml` is the single source of truth for status. Do not repeat status inside the docs.
  Run `node scripts/build-task-index.mjs` after changing a `ticket.yaml`.
- ADRs are append-only. Never edit an accepted ADR - supersede it with a new one. Project-wide
  ADRs live in `docs/decisions/`; ticket-level ADRs live in the Tier 3 ticket's `adr/` folder.
