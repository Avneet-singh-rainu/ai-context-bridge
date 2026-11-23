import { useMemo, useState } from 'react';
import { buildContextMarkdown, suggestedFileName } from '../export/context-markdown';
import { ExtractTextButton } from '../screenshots/ExtractTextButton';
import type { Screenshot } from '../screenshots/import-screenshots';
import { describeOcr } from '../screenshots/ocr-status';
import { needsExtraction, type OcrEntry } from '../screenshots/ocr-store';
import { useScreenshots } from '../screenshots/ScreenshotsProvider';
import { usePageContent } from './PageContentProvider';
import { PageEditor } from './PageEditor';

interface Notice {
  kind: 'ok' | 'error';
  text: string;
}

interface TextEditorProps {
  screenshot: Screenshot;
  entry: OcrEntry | undefined;
  position: number;
  onEdit: (id: string, text: string) => void;
  onRestore: (id: string) => void;
}

function placeholderFor(entry: OcrEntry | undefined): string {
  if (!entry) return 'No text yet. Use Extract text.';
  if (entry.status === 'running') return 'Reading text...';
  return entry.error ?? 'Text extraction failed.';
}

function TextEditor({ screenshot, entry, position, onEdit, onRestore }: TextEditorProps) {
  const { id, fileName, thumbnailUrl } = screenshot;
  const isEdited = entry?.status === 'done' && entry.text !== entry.extractedText;
  const lineCount = entry?.text.split('\n').length ?? 0;

  return (
    <li className="text-editor">
      <div className="text-editor-head">
        <img className="text-editor-thumb" src={thumbnailUrl} alt="" />
        <div className="text-editor-title">
          <strong title={fileName}>
            {position}. {fileName}
          </strong>
          <span className="text-editor-status">{describeOcr(entry)}</span>
        </div>
        {isEdited && (
          <button type="button" className="text-button" onClick={() => onRestore(id)}>
            Restore
          </button>
        )}
      </div>
      {entry?.status === 'done' ? (
        <textarea
          aria-label={`Text from screenshot ${position}, ${fileName}`}
          value={entry.text}
          placeholder="No text was found. Type text here to add it to the package."
          rows={Math.min(14, Math.max(3, lineCount + 1))}
          spellCheck={false}
          onChange={(event) => onEdit(id, event.target.value)}
        />
      ) : (
        <p
          className={
            entry?.status === 'failed' ? 'text-editor-empty is-error' : 'text-editor-empty'
          }
        >
          {placeholderFor(entry)}
        </p>
      )}
    </li>
  );
}

export function ContextWorkspace() {
  const { screenshots, ocr, editText, restoreText } = useScreenshots();
  const { pages, editPage, restorePage, removePage } = usePageContent();
  const isEmpty = screenshots.length === 0 && pages.length === 0;
  const [notice, setNotice] = useState<Notice | null>(null);
  const canSave = window.bridge !== undefined;
  const pending = screenshots.filter((shot) => needsExtraction(ocr[shot.id])).length;

  const markdown = useMemo(
    () =>
      buildContextMarkdown(
        screenshots.map((shot) => ({ ...shot, ocr: ocr[shot.id] })),
        new Date(),
        pages.map((page) => ({
          url: page.extract.url,
          title: page.extract.title,
          extractedAt: page.extract.extractedAt,
          selection: page.selection,
          originalSelection: page.extract.selection,
          markdown: page.markdown,
          originalMarkdown: page.extract.markdown,
          stats: page.extract.stats,
        })),
      ),
    [screenshots, ocr, pages],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setNotice({
        kind: 'ok',
        text: `Copied the context package (${markdown.length} characters).`,
      });
    } catch {
      setNotice({ kind: 'error', text: 'Copy failed. Click inside the window and try again.' });
    }
  };

  const save = async () => {
    const response = await window.bridge?.saveContextPackage({
      markdown,
      suggestedName: suggestedFileName(new Date()),
    });
    if (response?.saved) setNotice({ kind: 'ok', text: `Saved to ${response.filePath}` });
    else if (response?.error) setNotice({ kind: 'error', text: response.error });
  };

  return (
    <section className="workspace context-workspace" aria-label="Context">
      <header className="screenshots-header">
        <div>
          <h1>Context</h1>
          <p>
            Check and edit the extracted text, then copy or save one Markdown package. Everything
            stays on this PC.
          </p>
        </div>
        <div className="screenshots-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => void save()}
            disabled={!canSave || isEmpty}
            title={canSave ? undefined : 'Needs the desktop app'}
          >
            Save as Markdown
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void copy()}
            disabled={isEmpty}
          >
            Copy to clipboard
          </button>
        </div>
      </header>

      <div role="status" aria-live="polite">
        {notice && (
          <p className={notice.kind === 'ok' ? 'context-notice' : 'context-notice is-error'}>
            {notice.text}
          </p>
        )}
      </div>

      {isEmpty ? (
        <p className="context-empty">
          Nothing collected yet. Add screenshots in the Screenshots view, or open a page in Browser
          and use Extract page text.
        </p>
      ) : (
        <>
          {pending > 0 && (
            <div className="context-pending">
              <span>
                {pending === 1
                  ? '1 screenshot has no text yet.'
                  : `${pending} screenshots have no text yet.`}
              </span>
              <ExtractTextButton />
            </div>
          )}
          <div className="context-columns">
            <div className="context-sources">
              {screenshots.length > 0 && (
                <>
                  <h2>Screenshot text</h2>
                  <ol className="text-editor-list">
                    {screenshots.map((screenshot, index) => (
                      <TextEditor
                        key={screenshot.id}
                        screenshot={screenshot}
                        entry={ocr[screenshot.id]}
                        position={index + 1}
                        onEdit={editText}
                        onRestore={restoreText}
                      />
                    ))}
                  </ol>
                </>
              )}
              {pages.length > 0 && (
                <>
                  <h2>Browser pages</h2>
                  <ol className="text-editor-list">
                    {pages.map((page, index) => (
                      <PageEditor
                        key={page.id}
                        page={page}
                        position={index + 1}
                        onEdit={editPage}
                        onRestore={restorePage}
                        onRemove={removePage}
                      />
                    ))}
                  </ol>
                </>
              )}
            </div>
            <div>
              <h2>Markdown package</h2>
              <pre className="markdown-preview">{markdown}</pre>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
