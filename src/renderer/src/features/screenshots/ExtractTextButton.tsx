import { needsExtraction } from './ocr-store';
import { useScreenshots } from './ScreenshotsProvider';

/** Runs OCR on every screenshot that has no text yet. Shown in Screenshots and Context. */
export function ExtractTextButton({ className = 'secondary-button' }: { className?: string }) {
  const { screenshots, ocr, importing, extracting, canExtract, extractText } = useScreenshots();
  const pending = screenshots.filter((shot) => needsExtraction(ocr[shot.id])).length;

  let label = 'Extract text';
  if (extracting) label = 'Extracting text...';
  else if (pending > 0) label = `Extract text (${pending})`;
  else if (screenshots.length > 0) label = 'Text extracted';

  return (
    <button
      type="button"
      className={className}
      disabled={!canExtract || extracting || importing || pending === 0}
      title={canExtract ? 'Read text on this PC with Windows OCR' : 'Needs the desktop app'}
      onClick={() => void extractText()}
    >
      {label}
    </button>
  );
}
