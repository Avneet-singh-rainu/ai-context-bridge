# Known Issues - issue-11

## 1. Google Chrome must be installed

**Status:** Accepted gap - pending sign-off

**Found:** 2026-11-23

**What happens:** The Chrome page engine cannot start on a machine without Google Chrome. The app
shows an install prompt instead of a browser page.

**Why it was not fixed here:** Bundling Chrome would enlarge the installer and add a redistribution
question. ADR 0002 accepts an installed Chrome.

**Blast radius:** Machines without Chrome cannot use the Browser view. Screenshots, OCR and Context
still work.

---

## 2. Headless Chrome can be rejected by anti-bot checks

**Status:** Accepted by design

**Found:** 2026-11-23

**What happens:** Google may still refuse sign-in in headless Chrome even though the browser is real
Chrome.

**Why it was not fixed here:** A headed Chrome window layered over the viewport is the documented
fallback. ADR 0002 records the tradeoff.

**Blast radius:** Google sign-in needs the fallback on affected accounts. Other pages are unaffected.
