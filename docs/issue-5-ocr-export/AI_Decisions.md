# AI Decisions - issue-5

Claude picks first and logs the pick here before acting; the user answers in a quiz at the end of
the turn. Never change a logged pick to match the answer.

## D1 - How the app calls Windows OCR

- Claude: the main process runs Windows PowerShell 5.1 (`powershell.exe -NoProfile -NonInteractive -Command -`) and feeds a fixed script through stdin; the image path goes in an environment variable; the script calls `Windows.Media.Ocr` and prints JSON.
- Why: no native addon to rebuild against Electron headers and no helper exe to compile or ship; Windows 10 and 11 include both PowerShell 5.1 and the OCR API; a script read from stdin is not blocked by the script-file execution policy; tested on this PC: 1.6 s, exact text.
- You: NodeRT native addon
- Result: Wrong. NodeRT packages are built on NAN, not Node-API, so they must be recompiled with Visual Studio build tools against every Electron version, and the packages have not been maintained for years; a failed build blocks the whole app. Fair point: it runs in-process, so it avoids the 1-second PowerShell start-up per image.
- Acted on: none - Claude pick kept

## D2 - How a screenshot reaches the OCR engine

- Claude: the renderer sends the original image bytes over IPC; main checks the size and file signature, writes a temporary copy in a private temp folder, runs OCR, and deletes the copy.
- Why: main never opens a file path that the renderer names, so a compromised renderer cannot make main read other files; the original pixels give the best OCR; Windows OCR needs a file, so a short-lived temp copy is the price.
- You: Send bytes, temp copy
- Result: Right - same as the Claude pick.
- Acted on: none - Claude pick kept

## D3 - How the Tesseract fallback is set up

- Claude: tesseract.js 7 in the main process with the English model from `@tesseract.js-data/eng`, loaded from disk with no network; used only when Windows OCR fails or is unavailable.
- Why: the tesseract.js default downloads the model from a CDN on first use, which breaks local-first and offline use; in the renderer, WebAssembly would need `wasm-unsafe-eval` in the CSP; a native tesseract.exe would need a separate install.
- You: tesseract.js default
- Result: Wrong. The default downloads the model from the jsdelivr CDN on first use, which breaks offline use and the local-first promise, and caches eng.traineddata in the current working folder. Fair point: the installer would be about 3 MB smaller.
- Acted on: none - Claude pick kept

## D4 - When OCR runs

- Claude: an **Extract text** button runs OCR on every screenshot that has no text yet, one at a time in list order; each result is stored by screenshot id; a failure marks only that screenshot and the rest continue; failed screenshots can be retried.
- Why: the user can reorder and remove before spending CPU; one at a time keeps the PC responsive and memory low; the handoff says one failed OCR must not lose other screenshots.
- You: Extract text button
- Result: Right - same as the Claude pick.
- Acted on: none - Claude pick kept
