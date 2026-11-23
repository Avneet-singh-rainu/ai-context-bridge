import { Check, Pencil, RefreshCw, TriangleExclamationPoint } from 'lucide-react';

/** Rough token count for chat context limits: about four characters per token in English. */
export const approxTokens = (text: string) => Math.ceil(text.length / 4);

/**
 * The package as it will be copied or saved. Generated from the sources until the user chooses
 * to edit it; then it is an editable copy that no longer follows the sources.
 */
export function PackagePreview({
  generated,
  edit,
  isStale,
  onStartEdit,
  onEdit,
  onDiscard,
}: {
  generated: string;
  edit: { text: string } | null;
  isStale: boolean;
  onStartEdit: () => void;
  onEdit: (text: string) => void;
  onDiscard: () => void;
}) {
  const text = edit ? edit.text : generated;
  return (
    <div className="package-preview">
      <div className="preview-head">
        <h2>{edit ? 'Editing package' : 'Package preview'}</h2>
        <span className="package-size">
          {text.length.toLocaleString()} characters · about {approxTokens(text).toLocaleString()}{' '}
          tokens
        </span>
        {edit ? (
          <button type="button" className="btn btn-plain" onClick={onDiscard}>
            {isStale ? (
              <RefreshCw size={14} aria-hidden="true" />
            ) : (
              <Check size={14} aria-hidden="true" />
            )}
            {isStale ? 'Regenerate' : 'Stop editing'}
          </button>
        ) : (
          <button type="button" className="btn btn-plain" onClick={onStartEdit}>
            <Pencil size={13} aria-hidden="true" />
            Edit package text
          </button>
        )}
      </div>
      {edit && isStale && (
        <div className="banner package-stale" data-tone="warning" role="status">
          <TriangleExclamationPoint size={15} aria-hidden="true" />
          <div className="banner-body">
            Sources or options changed after you started editing. Your edited text does not include
            those changes. Regenerate drops your edits and uses the current sources.
          </div>
        </div>
      )}
      {edit ? (
        <textarea
          className="markdown-preview markdown-editor"
          aria-label="Edit the Markdown package"
          value={edit.text}
          spellCheck={false}
          onChange={(event) => onEdit(event.target.value)}
        />
      ) : (
        <pre className="markdown-preview">{generated}</pre>
      )}
    </div>
  );
}
