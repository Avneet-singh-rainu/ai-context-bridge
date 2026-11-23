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
with both changes returned normal DuckDuckGo results for the same search. Local testing also found
that Google sign-in opened `chrome://signin-dice-web-intercept.top-chrome`, an internal Chrome page
the app cannot show. The sign-in flow then stalled on the visible account page. The launcher now adds
`--disable-features=SigninInterception` so Chrome keeps the sign-in flow on the tracked page.

**Why not fully fixed here:** Google sign-in needs a real account and a person at the keyboard. TC1
must confirm that the complete flow now stays inside the app. A headed Chrome window layered over the
viewport remains the fallback if Google still refuses headless sign-in. ADR 0002 records the
tradeoff.

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

**Status:** Partly fixed - needs manual test cases

**Found:** 2026-11-23

**What happens:** JPEG frames are pushed about five times a second and input is mapped from renderer
events to CDP commands. Text selection, IME input, modifier keys and fast scrolling may not behave
exactly as in Chrome. Local testing found two concrete faults. A screenshot sent while the page was
navigating or resizing sometimes received no CDP reply, so `frameInFlight` stayed true and the app
kept showing a stale frame; after a window resize that stale frame was stretched into the new box.
A frame capture was also requested for every mouse move, which queued input behind 40-60 ms JPEG
captures and made clicks and typing feel slow.

**What was fixed:** `CdpClient.send` now accepts a timeout and clears the pending command when the
timeout fires. `pumpFrame` gives each screenshot two seconds, so one silent reply can no longer stop
all later frames. Input no longer requests a frame for mouse moves, and other input frames are
limited to one every 100 ms. Local runs showed 15 frames in three seconds at normal size and 30
frames in three seconds after maximise. The renderer box and the frame's natural size matched at
normal size.

**Why not fully fixed here:** Text selection, IME input, modifier keys and fast scrolling still need
a person at the keyboard. TC4 in [Test_Cases.md](Test_Cases.md) records the check. The two pixel
difference seen once between the renderer box and the CDP viewport after maximise must be confirmed
again with a stable window layout.

**Blast radius:** Page interaction may feel different from Chrome until TC4 passes. Navigation,
capture, extraction and network recording do not depend on frame fidelity.
