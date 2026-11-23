import { formatBytes, type ImageFormat } from './image-validation';
import type { Screenshot } from './import-screenshots';

const FORMAT_LABELS: Record<ImageFormat, string> = { png: 'PNG', jpeg: 'JPG', webp: 'WEBP' };

interface ScreenshotCardProps {
  screenshot: Screenshot;
  index: number;
  total: number;
  onMove: (id: string, toIndex: number) => void;
  onRemove: (id: string) => void;
}

export function ScreenshotCard({
  screenshot,
  index,
  total,
  onMove,
  onRemove,
}: ScreenshotCardProps) {
  const { id, fileName, format, sizeBytes, width, height, thumbnailUrl } = screenshot;
  const position = index + 1;

  return (
    <li className="shot-card">
      <div className="shot-thumb">
        <img src={thumbnailUrl} alt={`Screenshot ${position}: ${fileName}`} />
        <span className="shot-index" aria-hidden="true">
          {position}
        </span>
      </div>
      <p className="shot-name" title={fileName}>
        {fileName}
      </p>
      <p className="shot-meta">
        {width} x {height} - {formatBytes(sizeBytes)} - {FORMAT_LABELS[format]}
      </p>
      <div className="shot-actions">
        <button
          type="button"
          className="icon-button"
          aria-label={`Move ${fileName} earlier`}
          title="Move earlier"
          disabled={index === 0}
          onClick={() => onMove(id, index - 1)}
        >
          {'<'}
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={`Move ${fileName} later`}
          title="Move later"
          disabled={index === total - 1}
          onClick={() => onMove(id, index + 1)}
        >
          {'>'}
        </button>
        <button
          type="button"
          className="text-button"
          aria-label={`Remove ${fileName}`}
          onClick={() => onRemove(id)}
        >
          Remove
        </button>
      </div>
    </li>
  );
}
