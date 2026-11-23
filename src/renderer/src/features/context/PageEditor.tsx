import { pageUrlForExport } from '../../../../shared/address';
import type { PageEntry } from './page-store';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function timeOf(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

interface PageEditorProps {
  page: PageEntry;
  position: number;
  onEdit: (id: string, field: 'markdown' | 'selection', text: string) => void;
  onRestore: (id: string) => void;
  onRemove: (id: string) => void;
}

/** Review box for one extracted page: what was read, what was cut or redacted, and the text. */
export function PageEditor({ page, position, onEdit, onRestore, onRemove }: PageEditorProps) {
  const { id, extract } = page;
  const { stats } = extract;
  const isEdited = page.markdown !== extract.markdown || page.selection !== extract.selection;
  const url = pageUrlForExport(extract.url);
  const facts = [
    plural(stats.characters, 'character'),
    plural(stats.headings, 'heading'),
    plural(stats.tables, 'table'),
    ...(stats.redactions > 0 ? [`${plural(stats.redactions, 'secret')} redacted`] : []),
    ...(stats.truncated ? ['cut at the size limit'] : []),
  ];
  const rows = Math.min(16, Math.max(4, page.markdown.split('\n').length + 1));

  return (
    <li className="text-editor page-editor">
      <div className="text-editor-head">
        <span className="page-badge">Page {position}</span>
        <div className="text-editor-title">
          <strong title={extract.title}>{extract.title || url}</strong>
          <span className="text-editor-status" title={extract.url}>
            {url} - read at {timeOf(extract.extractedAt)}
          </span>
          <span className="text-editor-status">
            {facts.join(' - ')}
            {isEdited ? ' - edited' : ''}
          </span>
        </div>
        {isEdited && (
          <button type="button" className="text-button" onClick={() => onRestore(id)}>
            Restore
          </button>
        )}
        <button
          type="button"
          className="text-button page-remove"
          aria-label={`Remove page ${position}, ${extract.title || url}`}
          onClick={() => onRemove(id)}
        >
          Remove
        </button>
      </div>
      {stats.truncated && (
        <p className="page-warning">
          The page was longer than the limits, so the end of it, extra tables, rows, or long cells
          were left out. Capture a screenshot for anything missing.
        </p>
      )}
      {extract.selection !== '' && (
        <label className="page-field">
          <span>Selected text</span>
          <textarea
            value={page.selection}
            rows={Math.min(6, Math.max(2, page.selection.split('\n').length + 1))}
            spellCheck={false}
            onChange={(event) => onEdit(id, 'selection', event.target.value)}
          />
        </label>
      )}
      <label className="page-field">
        <span>Page content (Markdown)</span>
        <textarea
          value={page.markdown}
          rows={rows}
          placeholder="No text. Type text here to add it to the package."
          spellCheck={false}
          onChange={(event) => onEdit(id, 'markdown', event.target.value)}
        />
      </label>
    </li>
  );
}
