# Changelog - issue-5

## 2026-11-23

- `src/main/ocr/recognize.ts` - `OcrProvider` interface, `recognizeWithFallback` (first engine
  that does not throw wins; an empty result does not trigger the fallback), and
  `normalizeOcrText`.
- `src/main/ocr/windows-ocr.ts` - Windows OCR through `powershell.exe` with a fixed script on
  stdin; 60-second timeout; refuses images over `OcrEngine.MaxImageDimension`.
- `src/main/ocr/tesseract-ocr.ts` - tesseract.js 7 worker with the bundled English model
  (`langPath` set, `cacheMethod: 'none'`), started on first use and stopped on quit.
- `src/main/ocr/ocr-service.ts` - one job at a time; bytes written to a private temp folder that
  is deleted after each job.
- `src/main/ipc-requests.ts`, `src/main/ipc.ts`, `src/preload/index.ts`,
  `src/shared/ipc-contract.ts` - `ocr:recognize` and `context:save` channels with payload checks;
  the save dialog starts in Documents with a sanitized name.
- `src/shared/image-format.ts` - the file signature check moved here from the renderer, so main
  and renderer share it; `image-validation.ts` re-exports it.
- `src/renderer/src/features/screenshots/ocr-store.ts`, `ocr-status.ts`,
  `ExtractTextButton.tsx`, `ScreenshotsProvider.tsx`, `ScreenshotCard.tsx`,
  `ScreenshotsWorkspace.tsx` - OCR text stored by screenshot id, **Extract text** button, and an
  OCR status line on each card.
- `src/renderer/src/features/export/context-markdown.ts` - Markdown package builder;
  `features/export/.gitkeep` removed.
- `src/renderer/src/features/context/ContextWorkspace.tsx`, `styles.css` - text boxes per
  screenshot, Markdown preview, copy, and save.
- `package.json` - runtime dependencies `tesseract.js` and `@tesseract.js-data/eng`.
- `electron-builder.yml` - leaves out the unused legacy English model (10.9 MB).
- `tests/unit/` - 25 new unit tests (OCR fallback, IPC payload checks, OCR store, Markdown
  builder); 48 in total.
