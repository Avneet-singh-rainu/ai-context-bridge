# Context package

Facts about the Markdown export that stay true after issue-5 closes. The builder is
`buildContextMarkdown` in `src/renderer/src/features/export/context-markdown.ts`; the view is
`src/renderer/src/features/context/ContextWorkspace.tsx`.

## Sections, in order

1. `# Context Package`
2. `## Capture information` - created date and time (local), screenshot count, which OCR engines
   ran, and "No AI service was used."
3. `## Screenshots` - one `### Screenshot N: <file name>` per screenshot, in list order, with the
   image size and format, the text source, and the text in a fenced `text` block.
4. `## Missing or uncertain information` - always says that OCR text can contain recognition
   errors and that visual details are not described; then one line per screenshot with no text.
5. `## Source references` - one line per screenshot: file name, size, format, and engine.

## Rules

- A screenshot is never dropped. No text found, not extracted yet, extraction failed, and text
  removed by the user each get their own line in the screenshot section and in the missing list.
- The text source names the engine, Tesseract's confidence, the fallback reason, and "edited by
  the user" when the text differs from the OCR output.
- The code fence is longer than any run of backticks inside the text, so OCR text cannot break
  out of its block.
- The preview is generated from the per-screenshot text and is read-only; the user edits the
  text boxes, not the preview.

## Copy and save

- **Copy to clipboard** uses `navigator.clipboard.writeText` in the renderer.
- **Save as Markdown** calls `window.bridge.saveContextPackage` (IPC `context:save`). Main shows
  the Windows save dialog, starting in Documents with a sanitized suggested name
  (`context-package-YYYY-MM-DD-HHMM.md`), and writes the file only to the path the user picks.
  Packages over 5 MB are refused.
