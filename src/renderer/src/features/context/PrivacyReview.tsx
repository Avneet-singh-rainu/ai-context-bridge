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

  return (
    <section aria-labelledby="privacy-review-title">
      <div className="section-head">
        <h2 id="privacy-review-title">Privacy review</h2>
      </div>
      <div className="privacy-review">
        <ul>
          <li data-kind={secrets > 0 ? 'warn' : 'ok'}>
            {secrets > 0 ? (
              <ShieldExclamationPoint size={18} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />
            )}
            <div className="privacy-row-text">
              {secrets > 0
                ? `${plural(secrets, 'secret')} redacted: ${where}.`
                : 'No secret patterns found in the included text.'}
              <span>Keys, tokens, and passwords never leave the app.</span>
            </div>
          </li>
          <li>
            <MailX size={18} strokeWidth={1.8} aria-hidden="true" />
            <label className="privacy-option">
              <div className="privacy-row-text">
                Hide email addresses
                <span>
                  {privacy.emails > 0
                    ? `${plural(privacy.emails, 'email address', 'email addresses')} found`
                    : 'None found'}
                </span>
              </div>
              <input
                type="checkbox"
                role="switch"
                aria-checked={privacy.emailsHidden}
                className="switch"
                checked={privacy.emailsHidden}
                onChange={(event) => onHideEmails(event.target.checked)}
              />
            </label>
          </li>
          <li>
            <Layers size={18} strokeWidth={1.8} aria-hidden="true" />
            <div className="privacy-row-text">
              {privacy.included} of {plural(total, 'item')} included
              {privacy.excluded > 0 ? `; ${privacy.excluded} left out and not exported` : ''}.
              <span>Turn items off below to leave them out.</span>
            </div>
          </li>
          <li>
            <Link2 size={18} strokeWidth={1.8} aria-hidden="true" />
            <div className="privacy-row-text">
              Page links appear without query strings or fragments.
              <span>Tokens and ids in links stay out of the package.</span>
            </div>
          </li>
          {isEdited && (
            <li>
              <PencilLine size={18} strokeWidth={1.8} aria-hidden="true" />
              <div className="privacy-row-text">
                Your edited text is checked for secrets again when you copy or save it.
              </div>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
