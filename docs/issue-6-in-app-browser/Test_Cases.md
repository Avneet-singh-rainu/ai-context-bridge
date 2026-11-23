# Test Cases - issue-6

**Status of this run:** 2026-11-23. TC1-TC9 and TC11 passed in the Electron dev app, driven
through the Chrome DevTools Protocol against a local test site (`127.0.0.1:8777`) and
`https://example.com`; whole-window screenshots confirmed the view placement. TC10 passed except
the location and camera requests (see Known_Issues). TC12 (packaged app) has not been run.

## TC1 - Open a page from the address bar

**Setup:** `npm run dev`; the app starts on Browser.

**Steps:**
1. Type `example.com` in the address bar and press Enter.

**Expected:** the start panel goes away and the page fills the viewport box exactly. The address
bar shows `https://example.com/`, the identity bar shows **Secure**, "Example Domain", and the
URL, and the status bar shows "Active page: example.com - Example Domain".

---

## TC2 - Local page and search words

**Steps:**
1. Type `127.0.0.1:8777` and press Enter.
2. Type `hello world` and press Enter.

**Expected:** step 1 opens `http://127.0.0.1:8777/` with the **Local** badge. Step 2 opens
`https://duckduckgo.com/?q=hello+world` (covered by unit tests; not loaded in the run).

---

## TC3 - Refused address

**Steps:**
1. Type `file:///C:/Windows/win.ini` and press Enter.

**Expected:** the page does not change and the notice says "Only http and https pages can be
opened."

---

## TC4 - Links, back, forward, reload

**Steps:**
1. Click a link to another page, then an in-page anchor.
2. Click Back twice, Forward once, and Reload.

**Expected:** the title, URL, and address bar follow every step; Back and Forward are enabled
only when history allows.

---

## TC5 - Popups stay in the same view

**Steps:**
1. Click a `target="_blank"` link, go back, then click a button that calls `window.open`.

**Expected:** each opens in the same view; no new window appears.

---

## TC6 - Blocked links and downloads

**Steps:**
1. Click a `mailto:` link, a `file:` link, and a download link.

**Expected:** `mailto:` shows "Blocked a mailto link..."; the download shows "Download blocked:
report.csv..."; the `file:` link does nothing (Chromium blocks it before the app sees it).

---

## TC7 - Capture a page

**Steps:**
1. On a page whose URL has `?id=7&token=abc123`, click **Capture screenshot**.

**Expected:** the capture state shows "Added page-<host>-<date-time>.png to Screenshots" in the
Browser view and the status bar, then goes back to Idle. Screenshots shows the capture with
"Captured from <host>".

---

## TC8 - Capture flows into text and the package

**Steps:**
1. Extract text in Screenshots, then open Context.

**Expected:** Windows OCR reads the captured page. The package shows "Source page: <title>
(<origin><path>)" and "captured from <origin><path>", with no `token=` anywhere.

---

## TC9 - The page view hides for other workspaces

**Steps:**
1. With a page open, switch to Screenshots, then Context, then Browser.

**Expected:** the page does not cover Screenshots or Context; back in Browser the same page
shows again.

---

## TC10 - Permissions are refused

**Steps:**
1. On a test page, request notifications, location, and the camera.

**Expected:** notifications resolve to `denied` with the notice "The page asked to use
notifications...". Location got no answer at all in the run, and the camera could not be tested
because the test PC has no camera.

---

## TC11 - Isolation and user agent

**Steps:**
1. In the page, read `typeof require`, `typeof process`, `typeof window.bridge`, and
   `navigator.userAgent`.

**Expected:** all three are `undefined`; the user agent has neither `Electron/` nor the app name.

---

## TC12 - Packaged app

**Steps:**
1. `npm run dist`, run `dist/win-unpacked/AI Context Bridge.exe`, and repeat TC1, TC7, and TC9.

**Expected:** the same results as in the dev app.
