import {
  Layers,
  Link2,
  MailX,
  PencilLine,
  ShieldCheck,
  ShieldExclamationPoint,
} from 'lucide-react';
import type { PrivacyReport } from '../export/context-markdown';

const plural = (count: number, word: string, many = `${word}s`) =>
  `${count} ${count === 1 ? word : many}`;

/** What the export will and will not contain, shown right before copy and save. */
export function PrivacyReview({
  privacy,
  isEdited,
  onHideEmails,
}: {
  privacy: PrivacyReport;
  isEdited: boolean;
  onHideEmails: (hide: boolean) => void;
}) {
  const total = privacy.included + privacy.excluded;
  const secrets = privacy.redactions.reduce((sum, entry) => sum + entry.count, 0);
  const where = privacy.redactions.map((entry) => `${entry.label} (${entry.count})`).join(', ');
  const emails =
    privacy.emails > 0 ? `${plural(privacy.emails, 'email', 'emails')} found` : 'None found';

  return (
    <section aria-labelledby="privacy-review-title">
      <div className="section-head">
        <h2 id="privacy-review-title">Privacy review</h2>
      </div>
      <div className="privacy-review">
        <div className="privacy-top">
          <span className="privacy-icon" data-kind={secrets > 0 ? 'warn' : 'ok'}>
            {secrets > 0 ? (
              <ShieldExclamationPoint size={18} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />
            )}
          </span>
          <div className="privacy-title">
            <strong>
              {secrets > 0 ? `${plural(secrets, 'secret')} redacted` : 'No secrets found'}
            </strong>
            <span>{secrets > 0 ? where : 'Keys, tokens, and passwords stay in the app.'}</span>
          </div>
          <span className="privacy-count">
            <Layers size={15} strokeWidth={1.8} aria-hidden="true" />
            {privacy.included} of {plural(total, 'item')} included
          </span>
        </div>
        <div className="privacy-bottom">
          <label className="privacy-option">
            <MailX size={15} strokeWidth={1.8} aria-hidden="true" />
            <span>Hide emails</span>
            <span className="privacy-muted">{emails}</span>
            <input
              type="checkbox"
              role="switch"
              aria-checked={privacy.emailsHidden}
              className="switch"
              checked={privacy.emailsHidden}
              onChange={(event) => onHideEmails(event.target.checked)}
            />
          </label>
          <span className="privacy-hint">
            <Link2 size={14} strokeWidth={1.8} aria-hidden="true" />
            Links drop query strings and fragments
          </span>
        </div>
        {isEdited && (
          <p className="privacy-note">
            <PencilLine size={14} strokeWidth={1.8} aria-hidden="true" />
            Edited text is checked again when you copy or save.
          </p>
        )}
      </div>
    </section>
  );
}
