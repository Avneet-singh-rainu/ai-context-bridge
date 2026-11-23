/** Rough token count for chat context limits: about four characters per token in English. */
const approxTokens = (text: string) => Math.ceil(text.length / 4);

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
      <div className="context-group-head">
        <h2>Markdown package</h2>
        <span className="package-size">
          {text.length} characters, about {approxTokens(text)} tokens
        </span>
        {edit ? (
          <button type="button" className="text-button" onClick={onDiscard}>
            {isStale ? 'Regenerate' : 'Stop editing'}
          </button>
        ) : (
          <button type="button" className="text-button" onClick={onStartEdit}>
            Edit package text
          </button>
        )}
      </div>
      {edit && isStale && (
        <p className="package-stale" role="status">
          Sources or options changed after you started editing. Your edited text does not include
          those changes. Regenerate drops your edits and uses the current sources.
        </p>
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
