# Changelog - issue-4

## 2026-11-23

- `src/renderer/src/features/screenshots/image-validation.ts` - pure checks: file signature for
  PNG, JPEG, and WEBP; width and height read from PNG IHDR, JPEG SOF, and WEBP VP8, VP8L, and
  VP8X headers; limits of 20 files, 20 MB per file, and 50 megapixels; duplicate detection.
- `src/renderer/src/features/screenshots/import-screenshots.ts` - reads files one at a time,
  decodes each with `createImageBitmap`, and makes a 480 x 360 WEBP data-URL thumbnail.
- `src/renderer/src/features/screenshots/screenshot-list.ts` - pure reducer for add, remove, and
  move.
- `src/renderer/src/features/screenshots/ScreenshotsProvider.tsx`, `src/renderer/src/App.tsx` -
  the screenshot list lives above the workspaces, so the list survives view switches.
- `src/renderer/src/features/screenshots/ScreenshotsWorkspace.tsx`, `ScreenshotCard.tsx` - the
  placeholder is replaced by the picker, drop zone, import report, and thumbnail grid with
  move and remove buttons.
- `src/renderer/src/main.tsx` - file drops outside a drop zone are refused, so a stray drop never
  opens the file in place of the app.
- `src/renderer/src/styles.css` - button, drop zone, and thumbnail grid styles.
- `tests/unit/image-validation.test.ts`, `tests/unit/screenshot-list.test.ts` - 18 new unit
  tests; 23 in total.
