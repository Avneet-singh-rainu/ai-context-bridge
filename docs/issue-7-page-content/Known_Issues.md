# Known Issues - issue-7

## 1. Screenshot OCR text is not redacted

**Status:** Not fixed - needs its own bug ticket

**Found:** 2026-11-23

**What happens:** `redactSecrets` runs on page text only. A screenshot that shows an API key
keeps it in its OCR text and in the package. docs/PRIVACY.md asks for secret patterns to be
redacted before export.

**Why it was not fixed here:** OCR text belongs to issue-5; the fix is to run `redactSecrets` on
the OCR result in main and count the redactions in the review.

**Blast radius:** anyone who screenshots a page with secrets on it.

## 2. Frames, shadow DOM, images, and canvas are not read

**Status:** Accepted gap

**Found:** 2026-11-23

**What happens:** the script reads the main frame's light DOM only. Text inside iframes, shadow
roots, images, canvas drawings, and SVG is not extracted. The package says so under missing
information.

**Why it was not fixed here:** each needs its own handling (frame scripts, shadow traversal, OCR);
a screenshot covers them for now.

**Blast radius:** pages built from web components or embedded frames.

## 3. Redaction uses a fixed pattern list

**Status:** Accepted gap

**Found:** 2026-11-23

**What happens:** secrets in formats not on the list are kept; a long ordinary value after a word
such as "token:" is redacted although it is not a secret.

**Why it was not fixed here:** pattern lists always trade misses against false alarms; the user
reviews and can edit the text before export.

**Blast radius:** unusual secret formats.

## 4. Merged table cells are flattened

**Status:** Accepted gap

**Found:** 2026-11-23

**What happens:** `colspan` and `rowspan` are ignored, so a merged cell appears once and the
columns after it can shift left; a table inside a cell becomes plain text in that cell.

**Why it was not fixed here:** Markdown tables cannot express merged cells.

**Blast radius:** complex report tables.
