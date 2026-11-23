# Known Issues - issue-9

## 1. Network and tooltip sources are not there yet

**Status:** Network part fixed in [issue-8](../issue-8-network-capture/Design.md) on 2026-11-23;
tooltips still pending hover capture

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

## 4. The package has no overall size budget

**Status:** Not fixed - planned, not built

**Found:** 2026-11-23

**What happens:** each page is capped at 50,000 characters (about 12,000 tokens) and up to 10
pages are allowed, and OCR text from 20 screenshots adds more. Together the package can approach
about 125,000 tokens, far more than a free AI chat accepts. The preview shows a token estimate but
nothing stops or trims an oversized package. Network capture (issue-8) will add more data.

**Why it was not fixed here:** the review and export work came first; the budget was raised after
issue-9. The user chose to record the plan before building it.

**Planned fix:**

- A target picker in Context: Free chat (about 8,000 tokens), Standard (about 32,000), Large
  (about 128,000).
- A meter in the toolbar: tokens used against the target, amber at 80% and red when over.
- Each item shows its own token size, so the heavy items are easy to spot.
- Fit to budget: switch to compact, then trim the largest items first at block boundaries, mark
  each "cut to fit", never drop an item silently, and let Restore undo it.
- Copy and Save warn when the package is over the target.
- Network responses (issue-8) count against the same budget and start left out.

**Blast radius:** anyone who collects many pages or screenshots and pastes into a free chat.
