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

---

## 3. No Electron browser fallback is built

**Status:** Accepted by design

**Found:** 2026-11-23

**What happens:** If Chrome is missing or Google rejects headless sign-in, the Browser view shows a
notice. The app does not switch back to the old Electron `WebContentsView` browser.

**Why it was not fixed here:** Keeping two browser engines would double the capture and extraction
paths. ADR 0002 accepts one page engine. The old code remains in git history only.

**Blast radius:** The Browser view is unavailable on those machines. Screenshots, OCR and Context
still work.

---

## 4. Frame and input fidelity is unverified on real pages

**Status:** Not fixed - needs manual test cases

**Found:** 2026-11-23

**What happens:** JPEG frames are pushed about five times a second and input is mapped from renderer
events to CDP commands. Text selection, IME input, modifier keys and fast scrolling may not behave
exactly as in Chrome.

**Why it was not fixed here:** These behaviours need a real Chrome window and a person at the
keyboard. TC4 in [Test_Cases.md](Test_Cases.md) records the check.

**Blast radius:** Page interaction may feel different from Chrome until TC4 passes. Navigation,
capture, extraction and network recording do not depend on frame fidelity.
