# Test Cases - issue-4

**Status of this run:** 2026-11-23. TC1-TC7 passed in the renderer preview (`npm run dev`,
`http://localhost:5173`), with files injected through the drop zone and the file input from a
script. TC8 (the native Windows picker and a drag from File Explorer in the Electron window) has
not been run yet.

## TC1 - Import 5-10 screenshots by drag-and-drop

**Setup:** `npm run dev`, then open **Screenshots**.

**Steps:**
1. Drag 8 screenshots (a mix of PNG, JPG, and WEBP) onto the view.

**Expected:** a "Drop to add screenshots" overlay shows during the drag. After the drop, 8 cards
appear in drop order, numbered 1-8, each with a thumbnail, the filename, and
"width x height - size - format". The counter shows "8 of 20" and the report says "Added 8
screenshots."

---

## TC2 - Import with Add screenshots

**Steps:**
1. Click **Add screenshots** and pick 2 files, one of which is already in the list.

**Expected:** the new file is added at the end; the report says the other is already imported.
Picking the same file again after removing it works, because the input is cleared after each pick.

---

## TC3 - Bad files are skipped with a reason

**Steps:**
1. Drop a text file renamed `.png`, a `.gif`, a file over 20 MB, a damaged PNG, and a PNG whose
   header claims 10000 x 10000 pixels, together with valid screenshots.

**Expected:** the valid screenshots are added and each bad file is listed with its reason: not a
PNG, JPG, or WEBP image; larger than 20 MB; damaged and could not be decoded; 100 megapixels, over
the 50-megapixel limit. One bad file never stops the others.

---

## TC4 - Reorder and remove

**Steps:**
1. Click **<** on card 2.
2. Click **Remove** on card 3.

**Expected:** cards 1 and 2 swap, card 3 is gone, and the numbers and the counter update. **<** is
disabled on the first card and **>** on the last.

---

## TC5 - The list survives switching views

**Steps:**
1. With screenshots imported, open **Context**, then **Screenshots** again.

**Expected:** the same screenshots are listed in the same order.

---

## TC6 - The 20-screenshot limit

**Steps:**
1. With 8 screenshots in the list, drop 14 more.

**Expected:** 12 are added, the last 2 are skipped with "The limit of 20 screenshots is
reached.", the counter shows "20 of 20", and **Add screenshots** is disabled.

---

## TC7 - Unit tests and build

**Steps:**
1. `npm test`
2. `npm run check`
3. `npm run build`

**Expected:** 23 tests pass, Biome reports no errors, and the build writes `out/`.

---

## TC8 - Native picker and File Explorer in the Electron window

**Steps:**
1. `npm run dev` and use the Electron window, not the browser preview.
2. Click **Add screenshots**, pick 5 screenshots in the Windows picker.
3. Drag 3 more screenshots from File Explorer onto the view.
4. Drag one screenshot onto the sidebar.

**Expected:** the picker filters to PNG, JPG, and WEBP; all 8 screenshots import; the drop on the
sidebar does nothing and the app page stays.
