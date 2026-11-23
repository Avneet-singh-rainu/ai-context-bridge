# Known Issues - issue-6

## 1. A location request gets no answer

**Status:** Not fixed - needs its own bug ticket

**Found:** 2026-11-23

**What happens:** `navigator.geolocation.getCurrentPosition` in a page never calls back, not even
with the timeout error, and the app's permission handler is not called, so no notice shows. No
location is shared.

**Why it was not fixed here:** the cause sits inside Electron's location service; it needs its
own investigation.

**Blast radius:** pages that wait for location before showing content.

## 2. Camera and microphone refusal is untested

**Status:** Accepted gap - not tested

**Found:** 2026-11-23

**What happens:** the test PC has no camera, so `getUserMedia` failed with `NotFoundError` before
any permission request. The deny-all permission handler should refuse it on a PC with a camera.

**Why it was not fixed here:** needs a PC with a camera.

**Blast radius:** none known.

## 3. Clicking a file: link inside a page shows no notice

**Status:** Accepted by design

**Found:** 2026-11-23

**What happens:** Chromium blocks `file:` links from web pages before `will-navigate` fires, so
nothing happens and the app shows no notice. A `file:` address typed in the address bar does get
the notice.

**Why it was not fixed here:** the link is blocked either way.

**Blast radius:** a click that seems to do nothing.

## 4. No keyboard shortcuts

**Status:** Accepted gap

**Found:** 2026-11-23

**What happens:** F5, Ctrl+R, Alt+Left, Alt+Right, and Ctrl+L do nothing; while the page has
focus, key presses go to the page.

**Why it was not fixed here:** not in the issue; needs `before-input-event` on the page view.

**Blast radius:** keyboard users.

## 5. Downloads are always blocked

**Status:** Accepted by design

**Found:** 2026-11-23

**What happens:** every download is cancelled with a notice. See D2 in
[AI_Decisions.md](AI_Decisions.md).

**Why it was not fixed here:** the app browses and captures; saving files is out of scope.

**Blast radius:** users who want a file from a site must use another browser.
