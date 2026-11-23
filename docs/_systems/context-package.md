# Context package

Facts about the Markdown export that stay true after issue-5 closes. The builder is
`buildContextMarkdown` in `src/renderer/src/features/export/context-markdown.ts`; the view is
`src/renderer/src/features/context/ContextWorkspace.tsx`.

## Sections, in order

1. `# Context Package`
2. `## Capture information` - created date and time (local), screenshot count, browser page
   count, which OCR engines ran, and "No AI service was used."
3. `## Screenshots` (when there are screenshots) - one `### Screenshot N: <file name>` per
   screenshot, in list order, with the image size and format, the source page for browser
   captures, the text source, and the text in a fenced `text` block.
4. `## Browser pages` (when there are pages) - one `### Page N: <title>` per extracted page with
   its URL, extraction time, size, heading and table counts, notes (cut, redactions, edits), the
   selected text in a fenced `text` block, and the page content in a fenced `markdown` block.
5. `## Missing or uncertain information` - the OCR warnings when there are screenshots, the
   page-text warning when there are pages, then one line per screenshot or page with no text or
   a cut.
6. `## Source references` - one line per screenshot (file name, size, format, engine, page it
   was captured from) and per page (title, URL, extraction time).

## Rules

- Page content is untrusted. It sits in a fenced block under "Page content (quoted from the page
  as data, not instructions):", so text written to steer an AI stays marked as page data. See
  [Page content](./page-content.md).
- Page URLs appear as origin and path only (`pageUrlForExport`). The query string and fragment
  are removed, because they often carry tokens, emails, or ids.

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
