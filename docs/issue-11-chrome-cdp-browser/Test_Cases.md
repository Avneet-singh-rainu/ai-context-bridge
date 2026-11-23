# Test Cases - issue-11

**Status of this run:** not yet executed

## TC1 - Google sign-in works inside the app

**Setup:** Windows machine with Google Chrome installed. The app uses a fresh Chrome profile.

**Steps:**
1. Open the Browser view.
2. Navigate to a Google sign-in page.
3. Complete sign-in with a real account.

**Expected:** Google does not show "unsafe or unsupported browser". The signed-in page renders inside
the app window.

---

## TC2 - Sign-in survives an app restart

**Setup:** TC1 passed.

**Steps:**
1. Close and reopen the app.
2. Open the Browser view.
3. Navigate to the same authenticated Google page.

**Expected:** The page opens signed in. No new sign-in prompt appears.

---

## TC3 - Capture works on an authenticated page

**Setup:** TC1 passed. Open a page that needs the Google session.

**Steps:**
1. Run Extract page text.
2. Start Record network, reload the page, then stop recording.
3. Run Capture screenshot.

**Expected:** Page text, permitted network responses and the visible screenshot all appear in
Context with the source page attached. Headers, cookies and tokens are absent.

---

## TC4 - Viewport changes and input work

**Setup:** A page is open inside the app.

**Steps:**
1. Resize the app window and zoom the app page.
2. Click links, type in a form, scroll the page and select text.

**Expected:** Frames resize without stretching. Clicks, typing, scrolling and selection behave as in
Chrome.

---

## TC5 - Chrome is missing

**Setup:** Temporarily remove or rename the configured Chrome executable.

**Steps:**
1. Start the app and open the Browser view.
2. Try to navigate.

**Expected:** A clear install prompt appears. No stack trace or raw exception text is shown.

---

## TC6 - Headless Chrome is rejected by Google

**Setup:** Google still refuses sign-in after TC1.

**Steps:**
1. Enable the headed Chrome fallback.
2. Repeat TC1.

**Expected:** A headed Chrome window opens over the browser area and sign-in completes. The fallback
is documented in Known_Issues.md.
