# Test Cases - issue-5

**Status of this run:** 2026-11-23. TC1-TC6 and TC9 passed in the Electron dev app, driven
through the Chrome DevTools Protocol (test images drawn on a canvas and dropped on the view).
TC1-TC3 also passed in the packaged app (`dist/win-unpacked`). TC7 passed up to the save dialog;
writing the file was not run. TC8 and TC10 have not been run.

## TC1 - Extract text from 5 screenshots

**Setup:** `npm run dev`, import 5 screenshots with text (PNG, JPG, and WEBP).

**Steps:**
1. Click **Extract text (5)** in the Screenshots view.

**Expected:** cards turn to "Extracting text..." one at a time, in order, then show
"N lines - Windows OCR". The button ends as "Text extracted". The run took about 6 seconds for 5
images.

---

## TC2 - A screenshot with no text

**Steps:**
1. Import a blank image and extract text.

**Expected:** the card shows "No text found - Windows OCR". The package says
"Extracted text: none found." and lists the screenshot under missing information.

---

## TC3 - Fallback to Tesseract

**Steps:**
1. Import a PNG 1200 x 12000 pixels with text near the top, then extract text.

**Expected:** Windows OCR refuses the image (over 10000 pixels on one side), Tesseract reads it,
and the card shows "2 lines - Tesseract (fallback)". The package text source reads "Tesseract,
96% confidence (Windows OCR failed: The image is larger than 10000 pixels on one side.)".

---

## TC4 - Edit and restore text

**Steps:**
1. In Context, add a line to one screenshot's text.
2. Click **Restore**.

**Expected:** after step 1, the status shows ", edited", **Restore** appears, and the package says
"Windows OCR, edited by the user" with the new line. After step 2, the OCR text is back. Step 2 is
covered by unit tests only.

---

## TC5 - Markdown package

**Expected:** the preview has Capture information, one section per screenshot in list order with
fenced text, Missing or uncertain information (OCR warning, no visual details, per-screenshot
gaps), and Source references; it says "No AI service was used."

---

## TC6 - Copy to clipboard

**Steps:**
1. Click **Copy to clipboard**.
2. Paste into any editor, or run `Get-Clipboard` in PowerShell.

**Expected:** the notice says "Copied the context package (N characters)." and the clipboard holds
exactly the preview text.

---

## TC7 - Save as Markdown

**Steps:**
1. Click **Save as Markdown**.
2. Pick a folder and click Save.
3. Repeat and click Cancel.

**Expected:** the Windows save dialog opens in Documents with the name
`context-package-YYYY-MM-DD-HHMM.md`. After Save, the notice says "Saved to <path>" and the file
matches the preview. After Cancel, nothing changes and no error shows.
The dialog opening with the suggested name and the Cancel path were checked; step 2 was not.

---

## TC8 - Remove a screenshot while its text is being read

**Steps:**
1. Extract text, and click **Remove** on the card that shows "Extracting text...".

**Expected:** the screenshot disappears, its result is dropped when it arrives, and the other
screenshots still get text.

---

## TC9 - Unit tests, build, and installer

**Steps:**
1. `npm test`, `npm run check`, `npm run build`, `npm run dist`

**Expected:** 48 tests pass, Biome reports no errors, the build writes `out/`, and the installer
is written to `dist/` (about 138 MB). No `ai-context-bridge-ocr-*` folder is left in the temp
folder after extraction, and no `eng.traineddata` cache file is written.

---

## TC10 - Renderer preview outside Electron

**Steps:**
1. While `npm run dev` runs, open `http://localhost:5173` in a normal browser.

**Expected:** **Extract text** and **Save as Markdown** are disabled with the tooltip "Needs the
desktop app"; **Copy to clipboard** still works.
