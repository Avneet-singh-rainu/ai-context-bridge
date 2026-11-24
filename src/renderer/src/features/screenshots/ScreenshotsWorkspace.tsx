import { CircleCheck, ImagePlus, LoaderCircle, Plus, TriangleExclamationPoint } from 'lucide-react';
import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react';
import { Toolbar } from '../../components/Toolbar';
import { imageFilesFromClipboard } from './clipboard-images';
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
  const problems = rejected.length > 0;
  return (
    <div className="banner import-report" data-tone={problems ? 'warning' : 'success'}>
      {problems ? (
        <TriangleExclamationPoint size={16} aria-hidden="true" />
      ) : (
        <CircleCheck size={16} aria-hidden="true" />
      )}
      <div className="banner-body">
        <p>
          {addedText}
          {problems && ` Skipped ${rejected.length}:`}
        </p>
        {problems && (
          <ul>
            {rejected.map((file) => (
              <li key={file.id}>
                <strong>{file.fileName}</strong> - {file.reason}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ScreenshotsWorkspace() {
  const {
    screenshots,
    ocr,
    importing,
    extracting,
    canExtract,
    lastImport,
    addFiles,
    remove,
    move,
    recognizeOne,
    editText,
    restoreText,
  } = useScreenshots();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isFull = screenshots.length >= SCREENSHOT_LIMITS.maxFiles;
  const withText = screenshots.filter((shot) => ocr[shot.id]?.status === 'done').length;

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

  // The Screenshots view is mounted only while it is active, so this listener stays local to it.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      // Text pasted into an OCR editor must stay text, not become a screenshot.
      if (target?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!event.clipboardData) return;
      const files = imageFilesFromClipboard(event.clipboardData);
      if (files.length === 0) return;
      event.preventDefault();
      void addFiles(files);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [addFiles]);

  return (
    <section
      className="view screenshots-workspace"
      aria-label="Screenshots"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Toolbar
        title="Screenshots"
        subtitle={
          <>
            <span className="screenshots-count">
              {screenshots.length} of {SCREENSHOT_LIMITS.maxFiles}
            </span>
            {screenshots.length > 0 && ` · ${withText} with text · in the order the AI reads them`}
          </>
        }
      >
        <ExtractTextButton />
        <button
          type="button"
          className="btn btn-primary"
          onClick={openPicker}
          disabled={importing || isFull}
          title={isFull ? 'The limit of 20 screenshots is reached' : 'Add PNG, JPG, or WEBP files'}
        >
          <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
          <span className="btn-label">Add screenshots</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          hidden
          onChange={handleInput}
        />
      </Toolbar>

      <div className="view-body">
        <div role="status" aria-live="polite">
          {importing ? (
            <div className="banner import-progress" data-tone="info">
              <LoaderCircle size={16} className="spin" aria-hidden="true" />
              <div className="banner-body">Checking and reading screenshots...</div>
            </div>
          ) : (
            lastImport && <ImportReport result={lastImport} />
          )}
        </div>

        {screenshots.length === 0 ? (
          <button type="button" className="drop-zone" onClick={openPicker} disabled={importing}>
            <span className="icon-tile">
              <ImagePlus size={30} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <h2>Drop screenshots here</h2>
            <p>
              Drop files, paste an image, or choose files. PNG, JPG, or WEBP, up to 20 MB each. Add
              up to 20; 5 to 10 works best.
            </p>
            <span className="btn btn-secondary">Choose files...</span>
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
                canExtract={canExtract}
                busy={extracting}
                onMove={move}
                onRemove={remove}
                onExtractText={(id) => void recognizeOne(id)}
                onEditText={editText}
                onRestoreText={restoreText}
              />
            ))}
          </ol>
        )}

        {isDragging && (
          <div className="drop-overlay" aria-hidden="true">
            <ImagePlus size={36} strokeWidth={1.6} />
            Drop to add screenshots
          </div>
        )}
      </div>
    </section>
  );
}
