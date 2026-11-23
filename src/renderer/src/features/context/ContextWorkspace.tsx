import { useMemo, useState } from 'react';
import { hideEmails, redactSecrets } from '../../../../shared/redact';
import { renderContextPackage, suggestedFileName } from '../export/context-markdown';
import { ExtractTextButton } from '../screenshots/ExtractTextButton';
import { needsExtraction } from '../screenshots/ocr-store';
import { useScreenshots } from '../screenshots/ScreenshotsProvider';
import { ContextGroupBlock } from './ContextGroupBlock';
import { useContextReview } from './ContextReviewProvider';
import { collectContextItems, groupItems } from './context-model';
import { PackagePreview } from './PackagePreview';
import { usePageContent } from './PageContentProvider';
import { PrivacyReview } from './PrivacyReview';
import type { ExportMode } from './review-store';

interface Notice {
  kind: 'ok' | 'error';
  text: string;
}

/** The "- Created:" line changes every minute; ignore it when checking for real changes. */
const withoutTimestamp = (text: string) => text.replace(/^- Created: .*$/m, '');

export function ContextWorkspace() {
  const { screenshots, ocr } = useScreenshots();
  const { pages } = usePageContent();
  const { review, setMode, setHideEmails, startEdit, editPackage, discardEdit } =
    useContextReview();
  const [notice, setNotice] = useState<Notice | null>(null);
  const canSave = window.bridge !== undefined;
  const pending = screenshots.filter((shot) => needsExtraction(ocr[shot.id])).length;

  const items = useMemo(
    () =>
      collectContextItems({
        notes: review.notes,
        screenshots: screenshots.map((shot) => ({ ...shot, ocr: ocr[shot.id] })),
        pages: pages.map((page) => ({
          id: page.id,
          url: page.extract.url,
          title: page.extract.title,
          extractedAt: page.extract.extractedAt,
          selection: page.selection,
          originalSelection: page.extract.selection,
          markdown: page.markdown,
          originalMarkdown: page.extract.markdown,
          stats: page.extract.stats,
        })),
        excluded: review.excluded,
      }),
    [review.notes, review.excluded, screenshots, ocr, pages],
  );

  const rendered = useMemo(
    () =>
      renderContextPackage(items, {
        createdAt: new Date(),
        mode: review.mode,
        hideEmails: review.hideEmails,
      }),
    [items, review.mode, review.hideEmails],
  );

  const groups = groupItems(items);
  const edit = review.edit;
  const isStale =
    edit !== null && withoutTimestamp(edit.basedOn) !== withoutTimestamp(rendered.markdown);
  const nothingIncluded = rendered.privacy.included === 0;
  const hasSources = items.some((item) => item.source !== 'note');

  /** The text that leaves the app. Edited text is cleaned again: the user may type anything. */
  const finalText = (): { text: string; redacted: number } => {
    if (!edit) return { text: rendered.markdown, redacted: 0 };
    const secrets = redactSecrets(edit.text);
    const text = review.hideEmails ? hideEmails(secrets.text).text : secrets.text;
    return { text, redacted: secrets.count };
  };

  const redactedNote = (count: number) =>
    count > 0
      ? ` ${count} secret pattern${count === 1 ? '' : 's'} in your edits ${count === 1 ? 'was' : 'were'} redacted.`
      : '';

  const copy = async () => {
    const { text, redacted } = finalText();
    try {
      await navigator.clipboard.writeText(text);
      setNotice({
        kind: 'ok',
        text: `Copied the context package (${text.length} characters).${redactedNote(redacted)}`,
      });
    } catch {
      setNotice({ kind: 'error', text: 'Copy failed. Click inside the window and try again.' });
    }
  };

  const save = async () => {
    const { text, redacted } = finalText();
    const response = await window.bridge?.saveContextPackage({
      markdown: text,
      suggestedName: suggestedFileName(new Date()),
    });
    if (response?.saved) {
      setNotice({ kind: 'ok', text: `Saved to ${response.filePath}.${redactedNote(redacted)}` });
    } else if (response?.error) {
      setNotice({ kind: 'error', text: response.error });
    }
  };

  return (
    <section className="workspace context-workspace" aria-label="Context">
      <header className="screenshots-header">
        <div>
          <h1>Context</h1>
          <p>
            Review everything collected, leave out what is not needed, then copy or save one
            Markdown package. Everything stays on this PC.
          </p>
        </div>
        <div className="screenshots-actions">
          <fieldset className="mode-switch">
            <legend className="visually-hidden">Package style</legend>
            {(['detailed', 'compact'] as ExportMode[]).map((mode) => (
              <label key={mode} className={review.mode === mode ? 'is-active' : undefined}>
                <input
                  type="radio"
                  name="package-mode"
                  value={mode}
                  checked={review.mode === mode}
                  onChange={() => setMode(mode)}
                />
                {mode === 'detailed' ? 'Detailed' : 'Compact'}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void save()}
            disabled={!canSave || nothingIncluded}
            title={canSave ? undefined : 'Needs the desktop app'}
          >
            Save as Markdown
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void copy()}
            disabled={nothingIncluded}
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

      <PrivacyReview
        privacy={rendered.privacy}
        isEdited={edit !== null}
        onHideEmails={setHideEmails}
      />

      <div className="context-columns">
        <div className="context-sources">
          {!groups.some((group) => group.source === 'note') && (
            <ContextGroupBlock group={{ source: 'note', label: 'Your notes', items: [] }} />
          )}
          {groups.map((group) => (
            <ContextGroupBlock key={group.source} group={group} />
          ))}
          {!hasSources && (
            <p className="context-empty">
              No sources yet. Add screenshots in the Screenshots view, or open a page in Browser and
              use Extract page text.
            </p>
          )}
        </div>
        <PackagePreview
          generated={rendered.markdown}
          edit={edit}
          isStale={isStale}
          onStartEdit={() => startEdit(rendered.markdown)}
          onEdit={editPackage}
          onDiscard={discardEdit}
        />
      </div>
    </section>
  );
}
