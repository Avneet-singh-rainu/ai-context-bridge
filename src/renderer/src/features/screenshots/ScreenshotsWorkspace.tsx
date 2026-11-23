import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';
import { ExtractTextButton } from './ExtractTextButton';
import { ACCEPTED_FILE_TYPES, SCREENSHOT_LIMITS } from './image-validation';
import type { ImportResult } from './import-screenshots';
import { ScreenshotCard } from './ScreenshotCard';
import { useScreenshots } from './ScreenshotsProvider';

function hasFiles(event: DragEvent) {
  return event.dataTransfer.types.includes('Files');
}

function ImportReport({ result }: { result: ImportResult }) {
  const { added, rejected } = result;
  const addedText =
    added.length === 1 ? 'Added 1 screenshot.' : `Added ${added.length} screenshots.`;
  return (
    <div className={rejected.length > 0 ? 'import-report has-problems' : 'import-report'}>
      <p>
        {addedText}
        {rejected.length > 0 && ` Skipped ${rejected.length}:`}
      </p>
      {rejected.length > 0 && (
        <ul>
          {rejected.map((file) => (
            <li key={file.id}>
              <strong>{file.fileName}</strong> - {file.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ScreenshotsWorkspace() {
  const { screenshots, ocr, importing, lastImport, addFiles, remove, move } = useScreenshots();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isFull = screenshots.length >= SCREENSHOT_LIMITS.maxFiles;

  const openPicker = () => inputRef.current?.click();

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    // Clear the input so the same file can be picked again after it is removed.
    event.currentTarget.value = '';
    void addFiles(files);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    // Leaving for a child element is not leaving the workspace.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setIsDragging(false);
    void addFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <section
      className="workspace screenshots-workspace"
      aria-label="Screenshots"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="screenshots-header">
        <div>
          <h1>Screenshots</h1>
          <p>
            Add PNG, JPG, or WEBP screenshots, up to 20 MB each. Put them in the order the AI should
            read them.
          </p>
        </div>
        <div className="screenshots-actions">
          <span className="screenshots-count">
            {screenshots.length} of {SCREENSHOT_LIMITS.maxFiles}
          </span>
          <ExtractTextButton />
          <button
            type="button"
            className="primary-button"
            onClick={openPicker}
            disabled={importing || isFull}
          >
            Add screenshots
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            hidden
            onChange={handleInput}
          />
        </div>
      </header>

      <div role="status" aria-live="polite">
        {importing ? (
          <p className="import-progress">Checking and reading screenshots...</p>
        ) : (
          lastImport && <ImportReport result={lastImport} />
        )}
      </div>

      {screenshots.length === 0 ? (
        <button type="button" className="drop-zone" onClick={openPicker} disabled={importing}>
          <strong>Drop screenshots here</strong>
          <span>or click to choose files</span>
        </button>
      ) : (
        <ol className="shot-grid" aria-label="Imported screenshots, in order">
          {screenshots.map((screenshot, index) => (
            <ScreenshotCard
              key={screenshot.id}
              screenshot={screenshot}
              ocr={ocr[screenshot.id]}
              index={index}
              total={screenshots.length}
              onMove={move}
              onRemove={remove}
            />
          ))}
        </ol>
      )}

      {isDragging && (
        <div className="drop-overlay" aria-hidden="true">
          Drop to add screenshots
        </div>
      )}
    </section>
  );
}
