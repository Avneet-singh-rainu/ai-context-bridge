markdown
# Replication - ISSUE-NNNN

<!-- Required for every BUG ticket, any tier. Not used for features.
     Goal: a stranger can make the bug happen again on staging (or dev) from this file alone,
     before the fix, and use the same steps to prove the fix after.
     Keep it to the shortest path that shows the bug. Edge cases belong in Test_Cases.md. -->

**Replicated:** not yet
<!-- One of: not yet / yes on <env> <date> (<record ids>) / could not - <reason>.
     Update in place once tried. -->

## Bug in one line

<!-- What the user sees, with the real numbers from the ticket. -->

## Where it was seen

| Field | Value |
|---|---|
| Environment | <!-- prod agency / database --> |
| Records | <!-- invoice numbers, client, payer, schedule ids --> |
| Seen value | |
| Expected value | |

## What triggers it

<!-- The exact condition, in plain words. Name the time window, role, setting or data shape
     that has to be true. If timing matters, give it in UTC, the user's timezone AND IST. -->

## Setup

<!-- Environment, office, user (and that user's timezone), settings to turn on, test data to
     create. Link docs/_systems/ or the test-data runbook rather than repeating it. -->

## Steps

1.

## Bug result (before the fix)

<!-- What you should see if the bug is present. The numbers or rows that prove it. -->

## Fixed result (after the fix)

<!-- What the same steps show once the fix is deployed. -->

## Check query

<!-- Read-only. WITH (NOLOCK). No inline -- comments (they break when pasted). -->

```sql
```

