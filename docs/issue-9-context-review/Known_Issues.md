# Known Issues - issue-9

## 1. Network and tooltip sources are not there yet

**Status:** Accepted gap - pending M6 (issue #8) and hover capture

**Found:** 2026-11-23

**What happens:** the issue lists network and tooltips among the sources; neither capture exists,
so the review shows only notes, screenshots, and pages.

**Why it was not fixed here:** M6 was skipped and tooltip capture is a later feature; the model
reserves both source types, so each needs only a converter in `collectContextItems` and a
section in the package.

**Blast radius:** no API data or tooltip text in the package yet.

## 2. The review shows raw OCR text; only the export is redacted

**Status:** Accepted by design

**Found:** 2026-11-23

**What happens:** a secret read by OCR stays visible in the screenshot's text box in Context; the
preview, the clipboard, and the saved file have it redacted. Page text, by contrast, is redacted
in main at extraction.

**Why it was not fixed here:** redaction at export covers every source in one place; nothing is
persisted, so the raw text never leaves memory. Redacting OCR text in main would also hide it
from the user's review.

**Blast radius:** someone looking at the screen while the review is open.

## 3. No search in the review

**Status:** Accepted gap

**Found:** 2026-11-23

**What happens:** the handoff suggests search within collected context; the review has none.

**Why it was not fixed here:** not in the issue; at 20 screenshots and 10 pages the list stays
short.

**Blast radius:** larger collections.
