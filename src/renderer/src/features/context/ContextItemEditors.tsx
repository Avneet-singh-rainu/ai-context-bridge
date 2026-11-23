import { StickyNote } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Screenshot } from '../screenshots/import-screenshots';
import { describeOcr } from '../screenshots/ocr-status';
import type { OcrEntry } from '../screenshots/ocr-store';
import type { UserNote } from './context-model';

/** The include switch shown at the end of every item. */
export function IncludeToggle({
  included,
  label,
  onChange,
}: {
  included: boolean;
  label: string;
  onChange: (included: boolean) => void;
}) {
  return (
    <label
      className="include-toggle"
      title={included ? 'In the package. Turn off to leave it out.' : 'Left out of the package'}
    >
      <input
        type="checkbox"
        role="switch"
        aria-checked={included}
        className="switch"
        checked={included}
        aria-label={`Include ${label}`}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

/** Include-all switch for a group; shows a middle position when only some items are included. */
export function GroupToggle({
  includedCount,
  total,
  label,
  onChange,
}: {
  includedCount: number;
  total: number;
  label: string;
  onChange: (included: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const some = includedCount > 0 && includedCount < total;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some;
  }, [some]);
  return (
    <label className="group-toggle">
      {includedCount} of {total} included
      <input
        ref={ref}
        type="checkbox"
        className="switch"
        checked={includedCount === total}
        aria-label={`Include all ${label}`}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function NoteEditor({
  note,
  position,
  included,
  onToggle,
  onEdit,
  onRemove,
}: {
  note: UserNote;
  position: number;
  included: boolean;
  onToggle: (included: boolean) => void;
  onEdit: (text: string) => void;
  onRemove: () => void;
}) {
  return (
    <li className={included ? 'text-editor note-editor' : 'text-editor note-editor is-excluded'}>
      <div className="text-editor-head">
        <span className="item-icon" aria-hidden="true">
          <StickyNote size={17} strokeWidth={1.8} />
        </span>
        <div className="text-editor-title">
          <strong>Note {position}</strong>
          <span className="text-editor-status">Goes into the package exactly as you write it</span>
        </div>
        <div className="item-actions">
          <button
            type="button"
            className="btn btn-plain is-destructive"
            aria-label={`Remove note ${position}`}
            onClick={onRemove}
          >
            Remove
          </button>
          <IncludeToggle included={included} label={`note ${position}`} onChange={onToggle} />
        </div>
      </div>
      <textarea
        aria-label={`Note ${position}`}
        value={note.text}
        rows={Math.min(8, Math.max(2, note.text.split('\n').length + 1))}
        placeholder="For example: Explain why churn dropped this quarter, using the numbers below."
        onChange={(event) => onEdit(event.target.value)}
      />
    </li>
  );
}

function placeholderFor(entry: OcrEntry | undefined): string {
  if (!entry) return 'No text yet. Use Extract text.';
  if (entry.status === 'running') return 'Reading text...';
  return entry.error ?? 'Text extraction failed.';
}

export function ScreenshotTextEditor({
  screenshot,
  entry,
  position,
  included,
  onToggle,
  onEdit,
  onRestore,
}: {
  screenshot: Screenshot;
  entry: OcrEntry | undefined;
  position: number;
  included: boolean;
  onToggle: (included: boolean) => void;
  onEdit: (id: string, text: string) => void;
  onRestore: (id: string) => void;
}) {
  const { id, fileName, thumbnailUrl } = screenshot;
  const isEdited = entry?.status === 'done' && entry.text !== entry.extractedText;
  const lineCount = entry?.text.split('\n').length ?? 0;

  return (
    <li className={included ? 'text-editor' : 'text-editor is-excluded'}>
      <div className="text-editor-head">
        <img className="text-editor-thumb" src={thumbnailUrl} alt="" />
        <div className="text-editor-title">
          <strong title={fileName}>
            {position}. {fileName}
          </strong>
          <span className="text-editor-status">{describeOcr(entry)}</span>
        </div>
        <div className="item-actions">
          {isEdited && (
            <button type="button" className="btn btn-plain" onClick={() => onRestore(id)}>
              Restore
            </button>
          )}
          <IncludeToggle included={included} label={fileName} onChange={onToggle} />
        </div>
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
