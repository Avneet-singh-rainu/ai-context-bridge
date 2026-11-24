# ADR 0008: Responsive notch typography and compact tab cards

**Status:** Accepted
**Date:** 2026-11-23
**Supersedes:** 0007 (column count and tab label only)
**Superseded by:**

## Context

ADR 0007 set the four-zone top notch. The first build used 10 to 12 pixel text in the notch and
computed tab card columns in JavaScript from the tab count (2 columns at first, then 3). The user
said the top menu text was too small, the tab cards were too big, and the cards did not respond to
window resizing. The user also asked to remove the `Tabs (n)` label and the empty-state text.

## Decision

Increase notch text: view label 15 px, nav buttons 14 px, status chips 12 px, and address field
14 px. Keep the 76 px notch height. Give the left half more width than the right half so the search
field has room: a 1.5 to 1 ratio, dropping to 1.3 to 1 below 1100 px.

Remove the JavaScript column count. The tab grid uses CSS `repeat(auto-fill, minmax(88px, 1fr))`, so
the browser adds columns to fit the tabs and the window width. Cards drop from 27 px to 24 px tall.
Remove the `Tabs (n)` label and the empty-state sentence so the right zone shows only the new-tab
button and the cards.

ADR 0005, ADR 0006, and the four-zone decision in ADR 0007 stay in force. ADR 0008 replaces only the
fixed column count, the small text, and the tab label in ADR 0007.

## Consequences

### Positive

- Top menu text is easier to read.
- Tab cards stay small and add columns as tabs or window width grow.
- The right zone no longer carries a redundant count label.

### Negative / risks knowingly accepted

- Very narrow windows leave fewer columns and scroll the card grid.
- The change is local. Push, installer rebuild, and reinstall need explicit approval.
