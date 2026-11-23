# issue-5 - Add local OCR and context export

**Systems:** [ocr](../_systems/ocr.md), [context-package](../_systems/context-package.md),
[screenshots](../_systems/screenshots.md), [app-shell](../_systems/app-shell.md)
**Related:** [issue-4](../issue-4-screenshot-import/Design.md) (screenshot list this reads)

## Context / Problem

Milestone 3 turns imported screenshots into one Markdown package for an AI chat. The issue asks
for an OCR provider interface, Windows OCR with Tesseract as the fallback, OCR text stored by
screenshot id, editable text, a Markdown package, and copy and save. Acceptance: screenshot to
context works without any AI API.

## Design

How OCR runs, both engines, the fallback rule, and the no-network setup are in
[OCR](../_systems/ocr.md). The package format and copy and save are in
[Context package](../_systems/context-package.md). This ticket adds:

- **OCR in the main process.** Windows OCR runs through Windows PowerShell 5.1 with a fixed
  script on stdin, so there is no native addon or helper exe. Tesseract (tesseract.js 7) runs in
  a worker thread with the bundled English model, only when Windows OCR fails.
- **Bytes, not paths.** The renderer sends the image bytes; main checks them, writes a short-lived
  temporary copy for Windows OCR, and deletes it after the job.
- **Two IPC channels.** `ocr:recognize` and `context:save`, with payload checks in
  `src/main/ipc-requests.ts`. See [IPC_Contracts.md](IPC_Contracts.md).
- **Text stored by screenshot id.** `ocrReducer` keeps the engine's text and the user's edited
  text apart, so the package can say when text was edited and the user can restore it.
- **Extract text on request.** One button runs OCR on every screenshot without text, one at a
  time, in list order. A failure marks only that screenshot.
- **Context view.** One text box per screenshot, a read-only Markdown preview, **Copy to
  clipboard**, and **Save as Markdown** (save dialog in main).
- **Shared image checks.** The file signature check moved to `src/shared/image-format.ts`, so
  the renderer import check and the main OCR check use the same code.

The decisions behind these choices are in [AI_Decisions.md](AI_Decisions.md).

## Verification / Rollout

[Test_Cases.md](Test_Cases.md) lists the checks. Backing out means removing `src/main/ocr/`, the
two IPC channels, the OCR parts of `ScreenshotsProvider`, the Context view, and the tesseract.js
dependencies.
