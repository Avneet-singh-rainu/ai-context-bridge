import { LoaderCircle, ScanText } from 'lucide-react';
import { needsExtraction } from './ocr-store';
import { useScreenshots } from './ScreenshotsProvider';

/** Runs OCR on every screenshot that has no text yet. Shown in Screenshots and Context. */
export function ExtractTextButton({ className = 'btn btn-secondary' }: { className?: string }) {
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
      {extracting ? (
        <LoaderCircle size={15} className="spin" aria-hidden="true" />
      ) : (
        <ScanText size={15} strokeWidth={1.9} aria-hidden="true" />
      )}
      <span className="btn-label">{label}</span>
    </button>
  );
}
