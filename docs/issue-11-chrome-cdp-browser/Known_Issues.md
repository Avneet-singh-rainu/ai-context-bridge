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

**Status:** Partly fixed - still needs a manual Google sign-in test

**Found:** 2026-11-23

**What happens:** Headless Chrome exposed `navigator.webdriver` as true and a user agent containing
`HeadlessChrome`. DuckDuckGo used those signals to show its "Please try again" bot check instead of
search results. Google may still refuse sign-in for other reasons.

**What was fixed:** The launcher adds `--disable-blink-features=AutomationControlled` and the CDP page
removes the `Headless` token from Chrome's own user agent before navigation. A standalone Chrome run
with both changes returned normal DuckDuckGo results for the same search.

**Why not fully fixed here:** Google sign-in needs a real account and a person at the keyboard. A
headed Chrome window layered over the viewport remains the fallback if Google still refuses
headless sign-in. ADR 0002 records the tradeoff.

**Blast radius:** Sites that use other bot signals may still block pages. Screenshots, OCR and Context
still work.

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
