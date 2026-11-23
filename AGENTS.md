# Project instructions

These instructions apply to this repository only. The rules come from a personal setup kit; [docs/OPENCODE_SETUP.md](docs/OPENCODE_SETUP.md) records what was kept from the kit and what was removed.

## 1. Name the noun. Do not lean on pronouns.

Write the actual noun instead of "it", "they", "this", "that", "them", "those".

**Why:** a single paragraph about code can mention a procedure, a table, a record, a user and a
run. The word "it" could point at any one of those five, so the reader has to stop and work out
which one was meant. Naming the noun removes that work.

**How to apply:**

- Repeat the noun even when repeating feels clumsy. "The sync deletes the link, then the sync
  rebuilds the link" beats "it deletes it, then rebuilds it". Clumsy and clear beats smooth and
  ambiguous.
- Worst offenders are the start of a sentence - "This means...", "That is why...", "They are..." -
  and any pronoun following a sentence that named two or more nouns.
- Use the real name wherever a name exists: `SyncClientPayer`, step 9c, `ClientPayer`, the archive
  guard. Not "the procedure", "the statement", "the table", "the guard".
- A pronoun is fine when only one noun is in play and that noun was named in the same sentence.
  "The run finished and reported zero failures" does not need "the run" written twice.
- Applies to chat answers, commit messages, pull request descriptions, and the prose inside design
  documents and ADRs.

## 2. Keep answers short and in simple English.

Say the main point first, in a few lines. Use plain everyday words - "use" not "leverage", "start"
not "initiate", "same" not "identical". Explain a technical term once in plain words the first time
the term is needed, then keep using the term. Prefer short bullet lists and small tables over long
paragraphs. Do not repeat the same point in different words, and do not add background or
"worth knowing" sections unless asked.

This applies to chat replies. Files, design documents and ADRs can still carry full detail.

## 3. Use plain dashes, never em dashes.

## 4. Ask with a question popup when a decision is needed

When the user must choose between options, use the question tool (a popup) instead of a plain-text question. The user can miss or forget inline questions.

## 5. Confirm git network operations

Ask before running git commands that change remote or branch state. Read-only inspection (git status, git diff, git log, git show, git branch --list, git branch --show-current) and staging (git add) are allowed. Never push, force, or delete without explicit approval.

## 6. List changed files at the end

When a task changes files on disk, finish with the list of files changed.

## 7. Task documentation

Every GitHub issue gets a folder `docs/issue-<n>-<kebab-slug>/`. The full rules live in
[docs/_templates/README.md](docs/_templates/README.md). The short version:

- Pick a tier first (1 trivial, 2 standard, 3 heavy). The tier decides which template files to copy.
- `ticket.yaml` is the only place that holds a task's status. After changing any `ticket.yaml`,
  run `node scripts/build-task-index.mjs` to rebuild the task table in `docs/README.md`.
- A fact that stays true after the issue closes goes in `docs/_systems/`. The issue folder links to
  the `_systems/` doc instead of repeating the fact.
- Design docs describe the current state only. History goes in `CHANGELOG.md`.
- Never edit an accepted ADR. Write a new ADR that supersedes the old ADR.
