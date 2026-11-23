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
    <section className="privacy-review" aria-labelledby="privacy-review-title">
      <h2 id="privacy-review-title">Privacy review</h2>
      <ul>
        <li>
          {privacy.included} of {plural(total, 'item')} included
          {privacy.excluded > 0 ? `; ${privacy.excluded} left out and not exported` : ''}.
        </li>
        <li data-kind={secrets > 0 ? 'warn' : 'ok'}>
          {secrets > 0
            ? `${plural(secrets, 'secret')} redacted: ${where}.`
            : 'No secret patterns found in the included text.'}
        </li>
        <li>
          <label className="privacy-option">
            <input
              type="checkbox"
              checked={privacy.emailsHidden}
              onChange={(event) => onHideEmails(event.target.checked)}
            />
            Hide email addresses
          </label>{' '}
          (
          {privacy.emails > 0
            ? `${plural(privacy.emails, 'email address', 'email addresses')} found`
            : 'none found'}
          ).
        </li>
        <li>Page links appear without query strings or fragments.</li>
        {isEdited && (
          <li>Your edited text is checked for secrets again when you copy or save it.</li>
        )}
      </ul>
    </section>
  );
}
