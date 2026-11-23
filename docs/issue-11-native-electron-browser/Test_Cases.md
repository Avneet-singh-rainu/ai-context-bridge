# Test Cases - issue-11

## TC1 - Open and browse a page in the app

**Setup:** Start the local Electron build.

**Steps:**
1. Open the Browser view.
2. Enter `https://www.example.com/`.
3. Scroll the page and click a link.

**Expected:** The page paints in the app window with no separate browser window. Scrolling follows
the pointer without JPEG jumps. No Google Chrome process starts.

---

## TC2 - Resize and zoom the app

**Setup:** Keep `https://www.example.com/` open.

**Steps:**
1. Maximise the Electron window.
2. Return to the normal window size.
3. Change the app zoom if the build supports it.

**Expected:** The page fills the measured `.browser-viewport` box. No white band or stale image
remains after resize.

---

## TC3 - Capture a page screenshot

**Setup:** Open a settled page.

**Steps:**
1. Click **Capture screenshot**.

**Expected:** The screenshot shows the visible page area. The captured card carries the source URL,
title, and time. A capture right after navigation may retry before it succeeds.

---

## TC4 - Extract page text

**Setup:** Open a page with headings and body text.

**Steps:**
1. Select a sentence on the page.
2. Click **Extract page text**.

**Expected:** Context receives page text, headings, and the selected text. Secrets are redacted and
the result stays inside the documented size limits.

---

## TC5 - Record network responses

**Setup:** Open a page that calls a JSON API.

**Steps:**
1. Click **Record network**.
2. Trigger one API call.
3. Click **Stop** and open Context.

**Expected:** The endpoint appears with a body. Headers, cookies, and request bodies are absent.

---

## TC6 - Google sign-in with a real account

**Setup:** Use a real Google account with two-factor authentication ready.

**Steps:**
1. Open `https://accounts.google.com/` in the Browser view.
2. Complete sign-in, including any challenge.
3. Open a logged-in Google page in the same view.

**Expected:** Sign-in completes inside the app and the logged-in page renders. If Google rejects the
native view, the app shows the plain sign-in notice with no stack trace and no second window.

---

## TC7 - No Chrome installed

**Setup:** Use a machine without Google Chrome or temporarily hide the Chrome executable.

**Steps:**
1. Start the app.
2. Open the Browser view and navigate to `https://www.example.com/`.

**Expected:** The page opens normally. The app never asks for a Chrome install.

---

## TC8 - Blocked actions

**Setup:** Open any http(s) page.

**Steps:**
1. Try a `file:` link, a download link, and a camera permission request.
2. Open a `target="_blank"` link.

**Expected:** Blocked schemes and downloads show plain notices. Permission requests are denied. The
popup address opens in the same view, with no second window.
