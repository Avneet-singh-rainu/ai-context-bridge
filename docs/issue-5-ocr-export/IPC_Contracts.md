# IPC Contracts - issue-5

## ocr:recognize

**Direction:** renderer -> main (invoke)
**Preload API:** `window.bridge.recognizeText(request)`
**Main handler:** `recognizeImage` in `src/main/ocr/ocr-service.ts`

### Payload

```ts
interface OcrRequest {
  bytes: Uint8Array; // the original image file
}
```

Checked by `parseOcrRequest` in `src/main/ipc-requests.ts`: `bytes` must be a `Uint8Array` of at
most 20 MB with a PNG, JPEG, or WEBP file signature. No schema library is used; the check is a
few lines with unit tests.

### Result

```ts
type OcrResponse = { ok: true; result: OcrResult } | { ok: false; error: string };

interface OcrResult {
  engine: 'windows' | 'tesseract';
  text: string; // trimmed; empty when no text was found
  lineCount: number;
  durationMs: number;
  confidence?: number; // Tesseract only, 0-100
  fallbackReason?: string; // why Windows OCR failed, when Tesseract produced the result
}
```

### Result - errors

| Condition | What the caller receives |
|-----------|--------------------------|
| Not bytes, over 20 MB, or not PNG, JPEG, or WEBP | `{ ok: false, error }` with a one-line reason; no file is written |
| Windows OCR fails and Tesseract works | `{ ok: true }` with `engine: 'tesseract'` and `fallbackReason` |
| Both engines fail | `{ ok: false, error: 'Text extraction failed. Windows OCR: ... Tesseract: ...' }` |

---

## context:save

**Direction:** renderer -> main (invoke)
**Preload API:** `window.bridge.saveContextPackage(request)`
**Main handler:** `saveContextPackage` in `src/main/ipc.ts`

### Payload

```ts
interface SaveContextRequest {
  markdown: string; // at most 5 MB
  suggestedName: string; // file name only; main sanitizes it
}
```

Checked by `parseSaveRequest` and `sanitizeFileName` in `src/main/ipc-requests.ts`. Folders,
characters Windows forbids, and reserved names are removed from the suggested name.

### Result

```ts
type SaveContextResponse = { saved: true; filePath: string } | { saved: false; error?: string };
```

### Result - errors

| Condition | What the caller receives |
|-----------|--------------------------|
| User cancels the save dialog | `{ saved: false }` with no error; the view shows nothing |
| Markdown missing or over 5 MB | `{ saved: false, error }` |
| The file cannot be written | `{ saved: false, error: 'The file could not be written: ...' }` |
