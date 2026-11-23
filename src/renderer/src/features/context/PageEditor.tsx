import { Globe, TriangleExclamationPoint } from 'lucide-react';
import { pageUrlForExport } from '../../../../shared/address';
import { IncludeToggle } from './ContextItemEditors';
import type { PageEntry } from './page-store';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function timeOf(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

interface PageEditorProps {
  page: PageEntry;
  position: number;
  included: boolean;
  onToggle: (included: boolean) => void;
  onEdit: (id: string, field: 'markdown' | 'selection', text: string) => void;
  onRestore: (id: string) => void;
  onRemove: (id: string) => void;
}

/** Review box for one extracted page: what was read, what was cut or redacted, and the text. */
export function PageEditor({
  page,
  position,
  included,
  onToggle,
  onEdit,
  onRestore,
  onRemove,
}: PageEditorProps) {
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
    <li className={included ? 'text-editor page-editor' : 'text-editor page-editor is-excluded'}>
      <div className="text-editor-head">
        <span className="item-icon" aria-hidden="true">
          <Globe size={17} strokeWidth={1.8} />
        </span>
        <div className="text-editor-title">
          <strong title={extract.title}>
            {position}. {extract.title || url}
          </strong>
          <span className="text-editor-status" title={extract.url}>
            {url} · read at {timeOf(extract.extractedAt)}
          </span>
          <span className="text-editor-status">
            {facts.join(' · ')}
            {isEdited ? ' · edited' : ''}
          </span>
        </div>
        <div className="item-actions">
          {isEdited && (
            <button type="button" className="btn btn-plain" onClick={() => onRestore(id)}>
              Restore
            </button>
          )}
          <button
            type="button"
            className="btn btn-plain is-destructive page-remove"
            aria-label={`Remove page ${position}, ${extract.title || url}`}
            onClick={() => onRemove(id)}
          >
            Remove
          </button>
          <IncludeToggle
            included={included}
            label={`page ${position}, ${extract.title || url}`}
            onChange={onToggle}
          />
        </div>
      </div>
      {stats.truncated && (
        <div className="banner page-warning" data-tone="warning">
          <TriangleExclamationPoint size={15} aria-hidden="true" />
          <div className="banner-body">
            The page was longer than the limits, so its end, extra tables, rows, or long cells were
            left out. Capture a screenshot for anything missing.
          </div>
        </div>
      )}
      {extract.selection !== '' && (
        <label className="page-field">
          Selected text
          <textarea
            value={page.selection}
            rows={Math.min(6, Math.max(2, page.selection.split('\n').length + 1))}
            spellCheck={false}
            onChange={(event) => onEdit(id, 'selection', event.target.value)}
          />
        </label>
      )}
      <label className="page-field">
        Page content (Markdown)
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
