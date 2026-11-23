# OCR

Facts about local text extraction that stay true after issue-5 closes. Main-process code lives in
`src/main/ocr/`; the renderer side lives in `src/renderer/src/features/screenshots/`.

## Flow

1. **Extract text** (Screenshots or Context view) walks the screenshot list in order and picks
   each screenshot that has no text yet or whose last run failed.
2. For each one, the renderer reads the original file bytes and calls `window.bridge.recognizeText`
   (IPC channel `ocr:recognize`).
3. Main checks the bytes (`parseOcrRequest` in `src/main/ipc-requests.ts`): at most 20 MB, and a
   PNG, JPEG, or WEBP file signature.
4. Main writes the bytes to a new private folder under the system temp folder
   (`ai-context-bridge-ocr-*`), runs the engines, and deletes the folder when the job ends.
5. The result is stored in the renderer by screenshot id (`ocrReducer` in `ocr-store.ts`).

Main runs one OCR job at a time (`runInQueue` in `ocr-service.ts`). A failed screenshot is marked
failed; the others continue.

## Engines

Both engines sit behind the `OcrProvider` interface in `recognize.ts`. `recognizeWithFallback`
tries them in order:

| Order | Engine | How it runs | Languages |
|---|---|---|---|
| 1 | Windows OCR (`Windows.Media.Ocr`) | `powershell.exe` (Windows PowerShell 5.1) runs a fixed script fed through stdin; the image path is passed in the `ACB_OCR_IMAGE` environment variable; output is JSON | The user's installed Windows OCR languages |
| 2 | Tesseract (tesseract.js 7, WebAssembly) | A Node worker thread in the main process, started on first use and reused | English only, from `@tesseract.js-data/eng` (`4.0.0_best_int`) |

- Tesseract runs only when Windows OCR **throws**: no OCR language, PowerShell blocked, a decode
  error, a 60-second timeout, or an image over 10000 pixels on one side
  (`OcrEngine.MaxImageDimension`).
- An empty result is a valid answer ("No text found") and does not trigger the fallback.
- The result records which engine ran, Tesseract's mean confidence, and why Windows OCR failed.
- PowerShell 7 cannot load WinRT types, so the app always starts `powershell.exe`.
- The script is read from stdin, so the script-file execution policy does not apply.

## No network

tesseract.js downloads its model from a CDN unless `langPath` is set. The app sets `langPath` to
the bundled model folder and `cacheMethod: 'none'`, so Tesseract reads from disk and writes no
cache file. Windows OCR is part of Windows. In the packaged app, the Tesseract worker reads its
files from inside `app.asar`; no `asarUnpack` entry is needed.

## Text clean-up

`normalizeOcrText` unifies line endings, trims line ends, drops leading and trailing blank lines,
and keeps at most one blank line in a row.

## Stored per screenshot

`OcrEntry` in `ocr-store.ts`: status (`running`, `done`, `failed`), engine, `extractedText` (as the
engine returned it), `text` (what the user sees and exports; follows edits), confidence, fallback
reason, and error. Removing a screenshot forgets its entry. Everything lives in memory only.

## Limits

- Each Windows OCR call starts `powershell.exe`, about 1 second of overhead per image.
- The Tesseract fallback reads English only.
- `tesseract.js-core` adds about 44 MB to the app, including WebAssembly builds the app never
  loads. See [issue-5 Known_Issues](../issue-5-ocr-export/Known_Issues.md).
