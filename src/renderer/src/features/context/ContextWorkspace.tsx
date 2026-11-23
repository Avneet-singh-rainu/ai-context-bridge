import {
  CircleCheck,
  CircleExclamationPoint,
  Copy,
  Download,
  FileText,
  ScanText,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { hideEmails, redactSecrets } from '../../../../shared/redact';
import { Toolbar } from '../../components/Toolbar';
import { renderContextPackage, suggestedFileName } from '../export/context-markdown';
import { ExtractTextButton } from '../screenshots/ExtractTextButton';
import { needsExtraction } from '../screenshots/ocr-store';
import { useScreenshots } from '../screenshots/ScreenshotsProvider';
import { ContextGroupBlock } from './ContextGroupBlock';
import { useContextReview } from './ContextReviewProvider';
import { collectContextItems, groupItems } from './context-model';
import { approxTokens, PackagePreview } from './PackagePreview';
import { usePageContent } from './PageContentProvider';
import { PrivacyReview } from './PrivacyReview';
import type { ExportMode } from './review-store';

interface Notice {
  kind: 'ok' | 'error';
  text: string;
}

const MODES: { mode: ExportMode; label: string }[] = [
  { mode: 'detailed', label: 'Detailed' },
  { mode: 'compact', label: 'Compact' },
];

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
  const packageText = edit ? edit.text : rendered.markdown;

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

  const subtitle = nothingIncluded
    ? 'Nothing included yet'
    : `${rendered.privacy.included} item${rendered.privacy.included === 1 ? '' : 's'} included · about ${approxTokens(packageText).toLocaleString()} tokens`;

  return (
    <section className="view context-workspace" aria-label="Context">
      <Toolbar title="Context" subtitle={subtitle}>
        <fieldset className="segmented mode-switch">
          <legend className="visually-hidden">Package style</legend>
          {MODES.map(({ mode, label }) => (
            <label key={mode} className={review.mode === mode ? 'is-active' : undefined}>
              <input
                type="radio"
                name="package-mode"
                value={mode}
                checked={review.mode === mode}
                onChange={() => setMode(mode)}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void save()}
          disabled={!canSave || nothingIncluded}
          title={canSave ? 'Save the package as a Markdown file' : 'Needs the desktop app'}
        >
          <Download size={15} strokeWidth={1.9} aria-hidden="true" />
          <span className="btn-label">Save as Markdown</span>
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void copy()}
          disabled={nothingIncluded}
          title="Copy the package, ready to paste into an AI chat"
        >
          <Copy size={15} strokeWidth={1.9} aria-hidden="true" />
          <span className="btn-label">Copy to clipboard</span>
        </button>
      </Toolbar>

      <div className="context-split">
        <div className="context-list">
          {notice && (
            <div
              className="banner context-notice"
              data-tone={notice.kind === 'ok' ? 'success' : 'error'}
              role="status"
            >
              {notice.kind === 'ok' ? (
                <CircleCheck size={16} aria-hidden="true" />
              ) : (
                <CircleExclamationPoint size={16} aria-hidden="true" />
              )}
              <div className="banner-body">{notice.text}</div>
            </div>
          )}

          {pending > 0 && (
            <div className="banner context-pending" data-tone="info">
              <ScanText size={16} aria-hidden="true" />
              <div className="banner-body">
                {pending === 1
                  ? '1 screenshot has no text yet.'
                  : `${pending} screenshots have no text yet.`}
              </div>
              <ExtractTextButton />
            </div>
          )}

          <PrivacyReview
            privacy={rendered.privacy}
            isEdited={edit !== null}
            onHideEmails={setHideEmails}
          />

          {!groups.some((group) => group.source === 'note') && (
            <ContextGroupBlock group={{ source: 'note', label: 'Your notes', items: [] }} />
          )}
          {groups.map((group) => (
            <ContextGroupBlock key={group.source} group={group} />
          ))}

          {!hasSources && (
            <div className="context-empty-state">
              <span className="icon-tile">
                <FileText size={28} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <strong>Nothing collected yet</strong>
              Add screenshots in Screenshots, or open a page in Browser and use Extract page text.
            </div>
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
