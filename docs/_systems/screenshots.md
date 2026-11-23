# Screenshots

Facts about screenshot import that stay true after issue-4 closes. Code lives in
`src/renderer/src/features/screenshots/`.

## Flow

1. The user picks files with **Add screenshots** (an `<input type="file" multiple>`, which
   Electron shows as the native Windows picker) or drops files on the Screenshots view.
2. `importScreenshots` checks each file in order, one at a time, so only one full-size image is
   decoded at once.
3. Accepted files join the end of the list. The view shows how many were added and why each
   skipped file was skipped.

Everything runs in the renderer through the browser File API. The main process is not involved
and there is no IPC channel for import.

## Checks, in order

| Check | Limit or rule | Code |
|---|---|---|
| Count | At most 20 screenshots in the list | `checkFileBeforeRead` |
| Empty file | Size above 0 bytes | `checkFileBeforeRead` |
| File size | At most 20 MB per file | `checkFileBeforeRead` |
| Duplicate | Same name, size, and modified time as an imported file is skipped | `checkFileBeforeRead` |
| Format | PNG, JPEG, or WEBP by file signature (magic bytes); the extension and `file.type` are ignored | `detectImageFormat` |
| Header size | Width and height read from the first 1 MB, before decoding | `readImageSize` |
| Pixels | At most 50 megapixels | `checkImageSize` |
| Decode | `createImageBitmap` must succeed; a broken file is skipped | `importScreenshots` |

The limits live in `SCREENSHOT_LIMITS` in `image-validation.ts`. The header size check runs
before decoding, so a small file that would decode into a huge image is refused early. A file
named `.jpg` that holds PNG bytes is accepted as PNG.

## Data kept per screenshot

`Screenshot` in `import-screenshots.ts`: id, the original `File` (kept unchanged for OCR), file
name, format, MIME type, size in bytes, modified time, decoded width and height (after EXIF
rotation), and a thumbnail.

## Thumbnails

Each image is decoded once, scaled to fit 480 x 360, and stored as a small WEBP data URL. The
Content Security Policy already allows `data:` images, so no `blob:` source is needed. The
original file is never shown at full size in the list.

## State

`ScreenshotsProvider` (React context with `useReducer`) wraps the app in `App.tsx`, so the list
survives switching between Browser, Screenshots, and Context. `screenshotListReducer` in
`screenshot-list.ts` is a pure function for add, remove, and move. The list lives in memory only
and is gone when the app closes.

## Limits

- Reorder uses **<** and **>** buttons on each card; there is no drag-to-reorder.
- After **Remove**, keyboard focus is not moved to another card. See
  [issue-4 Known_Issues](../issue-4-screenshot-import/Known_Issues.md).
