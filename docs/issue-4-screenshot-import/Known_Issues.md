# Known Issues - issue-4

## 1. Keyboard focus is lost after Remove

**Status:** Accepted gap - pending sign-off

**Found:** 2026-11-23

**What happens:** after a keyboard user presses **Remove** on a card, the card and its button are
gone and focus falls back to the page, so the next Tab starts from the top.

**Why it was not fixed here:** moving focus to the next card needs refs per card; the list is
usable without it, and the fix fits a later accessibility pass.

**Blast radius:** keyboard and screen-reader users removing several screenshots in a row.

## 2. Duplicates are found by name, size, and modified time only

**Status:** Accepted by design

**Found:** 2026-11-23

**What happens:** two different files with the same name, size, and modified time count as one,
and the same image saved under a new name counts as new.

**Why it was not fixed here:** hashing every file would read all bytes up front; the three-field
check catches the common case of picking the same file twice.

**Blast radius:** rare false duplicates; repeated images under different names are imported twice.
