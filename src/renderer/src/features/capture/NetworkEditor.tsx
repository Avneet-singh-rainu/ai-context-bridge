import { ArrowLeftRight } from 'lucide-react';
import type { NetworkEntry } from '../../../../shared/network';
import { IncludeToggle } from '../context/ContextItemEditors';
import { formatBytes } from '../screenshots/image-validation';

function pathOf(endpoint: string): { host: string; path: string } {
  try {
    const url = new URL(endpoint);
    return { host: url.host, path: url.pathname || '/' };
  } catch {
    return { host: '', path: endpoint };
  }
}

/** Review box for one recorded API endpoint: what it is, how big it was, and the kept data. */
export function NetworkEditor({
  entry,
  text,
  position,
  included,
  onToggle,
  onEdit,
  onRestore,
  onRemove,
}: {
  entry: NetworkEntry;
  /** The text the user sees and exports (their edit, or the kept text). */
  text: string;
  position: number;
  included: boolean;
  onToggle: (included: boolean) => void;
  onEdit: (text: string) => void;
  onRestore: () => void;
  onRemove: () => void;
}) {
  const { host, path } = pathOf(entry.endpoint);
  const isEdited = text !== entry.text;
  const facts = [
    entry.calls > 1 ? `${entry.calls} calls merged` : '1 call',
    `${formatBytes(entry.originalBytes)} → ${formatBytes(text.length)} kept`,
    ...(entry.truncated ? ['pruned'] : []),
    ...(entry.redactions > 0
      ? [`${entry.redactions} secret${entry.redactions === 1 ? '' : 's'} redacted`]
      : []),
    ...(entry.queryKeys.length > 0 ? [`query: ${entry.queryKeys.join(', ')}`] : []),
  ];

  return (
    <li
      className={included ? 'text-editor network-editor' : 'text-editor network-editor is-excluded'}
    >
      <div className="text-editor-head">
        <span className="item-icon" aria-hidden="true">
          <ArrowLeftRight size={16} strokeWidth={1.9} />
        </span>
        <div className="text-editor-title">
          <strong title={entry.endpoint}>
            {position}. <span className="http-method">{entry.method}</span> {path}
          </strong>
          <span className="text-editor-status" title={entry.endpoint}>
            <span className="http-status" data-ok={entry.status < 400}>
              {entry.status}
            </span>{' '}
            {host} · {entry.mimeType}
          </span>
          <span className="text-editor-status" title={facts.join(' · ')}>
            {facts.join(' · ')}
            {isEdited ? ' · edited' : ''}
          </span>
        </div>
        <div className="item-actions">
          {isEdited && (
            <button type="button" className="btn btn-plain" onClick={onRestore}>
              Restore
            </button>
          )}
          <button
            type="button"
            className="btn btn-plain is-destructive"
            aria-label={`Remove response ${position}, ${entry.method} ${path}`}
            onClick={onRemove}
          >
            Remove
          </button>
          <IncludeToggle
            included={included}
            label={`response ${position}, ${entry.method} ${path}`}
            onChange={onToggle}
          />
        </div>
      </div>
      {entry.kind === 'none' ? (
        <p className="text-editor-empty">{entry.note ?? 'The body was not kept.'}</p>
      ) : (
        <textarea
          aria-label={`Data from response ${position}, ${entry.method} ${path}`}
          value={text}
          rows={Math.min(14, Math.max(4, text.split('\n').length + 1))}
          spellCheck={false}
          onChange={(event) => onEdit(event.target.value)}
        />
      )}
    </li>
  );
}
