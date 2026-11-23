# Test Cases - issue-9

**Status of this run:** 2026-11-23. TC1-TC8 passed in the Electron dev app, driven through the
Chrome DevTools Protocol with a local test page and two dropped screenshots; the clipboard was
checked with `Get-Clipboard`. TC9 (Save as Markdown click) and TC10 (packaged app) have not been
run.

## TC1 - Sources grouped in one review

**Setup:** extract a page, import and extract text from two screenshots, add a note.

**Expected:** Context shows Your notes, Screenshots, and Browser pages, each with "N of N
included"; the package puts User notes before Screenshots.

---

## TC2 - Leave one item out

**Steps:**
1. Clear Include on one screenshot.

**Expected:** the item is dimmed and still editable; the group box shows a dash and "1 of 2
included"; the package drops the screenshot and numbers the rest without gaps; the privacy
panel says "1 left out and not exported"; capture information says "Left out by the user: 1
item".

---

## TC3 - Leave a whole group out and bring it back

**Steps:**
1. Use the group box to clear and then tick all screenshots.

**Expected:** the Screenshots section disappears from the package and comes back.

---

## TC4 - Secrets in every source

**Setup:** a screenshot that shows `password: hunter2hunter2`, and a page with two secrets.

**Expected:** the package has no secret values; the privacy panel lists "3 secrets redacted:
Screenshot 1 (1), Page 1 (2)"; the screenshot section says "Notes: 1 secret redacted".

---

## TC5 - Email addresses

**Expected:** with Hide email addresses on (the default), the package shows `[email hidden]` and
the panel says "1 email address found"; turning the option off shows the address.

---

## TC6 - Compact package

**Steps:**
1. Switch to Compact.

**Expected:** no Capture information or Source references; notes, then `## Screenshot N` and
`## Page N` sections with text only; one closing "Sources: ..." line that mentions redaction and
hidden emails.

---

## TC7 - Edit the package text

**Steps:**
1. Click Edit package text, add a line `token: abcdefgh12345`, and click Copy to clipboard.

**Expected:** the notice says "1 secret pattern in your edits was redacted."; the clipboard has
`token: [REDACTED]`, the note, and no secret or email.

---

## TC8 - Stale edit

**Steps:**
1. While editing, change a source (for example, leave a group out).

**Expected:** a banner says sources changed after the edit; Regenerate drops the edit and shows
the generated package again.

---

## TC9 - Save as Markdown

**Steps:**
1. Click Save as Markdown, pick a folder, click Save.

**Expected:** the notice says "Saved to <path>." and the file matches the preview, with any
edits redacted.

---

## TC10 - Packaged app

**Steps:**
1. `npm run dist`, run the installed app, and repeat TC1, TC2, and TC7.

**Expected:** the same results as in the dev app.
