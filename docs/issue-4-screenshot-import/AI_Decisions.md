# AI Decisions - issue-4

Claude picks first and logs the pick here before acting; the user answers in a quiz at the end of
the turn. Never change a logged pick to match the answer.

## D1 - Where screenshot files are opened and read

- Claude: in the renderer only - an `<input type="file" multiple>` (Electron shows the native Windows picker) plus drag-and-drop, read through the browser File API; no new IPC channel.
- Why: the main process never has to read paths the renderer names, the sandbox stays as is, and File objects from the picker are disk-backed, so keeping them costs little memory.
- You: Main process + IPC
- Result: Wrong. Drops from File Explorer arrive in the renderer as File objects anyway, so main would have to read paths the renderer names and send up to 20 x 20 MB of bytes over IPC; the file input already shows the native Windows picker. Fair point: main will matter if a later milestone keeps screenshots across restarts.
- Acted on: none - Claude pick kept

## D2 - Where the imported screenshot list lives

- Claude: a React context with `useReducer`, provided above the workspaces in `App.tsx`; the reducer is a pure function with unit tests.
- Why: `App.tsx` unmounts the inactive workspace, so state inside `ScreenshotsWorkspace` would be lost on every view switch; Milestone 3 (OCR, Context) needs the same list; no new package.
- You: useState in workspace
- Result: Wrong. App.tsx unmounts the inactive workspace, so the list would be lost on every switch to Browser or Context (TC5). Fair point: useState lifted into App.tsx would also work; lifting the state is what matters, not reducer versus useState.
- Acted on: none - Claude pick kept

## D3 - How thumbnails are made

- Claude: decode each image once, draw a downscaled copy (fits 480 x 360) on a canvas, and show the copy as a small WEBP data URL; the CSP stays `img-src 'self' data:`.
- Why: no CSP change; 20 full-size screenshots shown as thumbnails would each be decoded at full size, while a downscaled copy keeps memory small; the original File is kept for OCR.
- You: Object URL of original
- Result: Wrong for the list. It needs blob: in the CSP, URLs must be revoked on remove, and each thumbnail decodes the full image: 20 4K screenshots hold about 660 MB decoded. Fair point: it is the simplest and suits a later click-to-zoom full-size preview.
- Acted on: none - Claude pick kept

## D4 - How a file is checked before import

- Claude: read the file signature (magic bytes) and the width and height from the file header, then decode the image; limits are 20 screenshots, 20 MB per file, and 50 megapixels per image; exact duplicates (same name, size, and modified time) are skipped.
- Why: the extension and `file.type` only reflect the filename; the header size check stops a small file that decodes into a huge image before decoding starts; the decode step catches broken files.
- You: extension + magic numbers (typed answer)
- Result: Partly right. Magic numbers is the core check and matches the Claude pick. The extension adds no safety and would refuse a real PNG saved as .jpg; the accept attribute already uses extensions as a picker filter. Missing: the header size check that stops a huge image before decoding, and the decode step that catches broken files.
- Acted on: none - Claude pick kept
