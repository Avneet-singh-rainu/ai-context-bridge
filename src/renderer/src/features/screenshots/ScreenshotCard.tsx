import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  CircleExclamationPoint,
  Globe,
  LoaderCircle,
  Trash,
} from 'lucide-react';
import { pageUrlForExport } from '../../../../shared/address';
import { formatBytes, type ImageFormat } from './image-validation';
import type { Screenshot } from './import-screenshots';
import { describeOcr } from './ocr-status';
import type { OcrEntry } from './ocr-store';

const FORMAT_LABELS: Record<ImageFormat, string> = { png: 'PNG', jpeg: 'JPG', webp: 'WEBP' };

function OcrIcon({ entry }: { entry: OcrEntry | undefined }) {
  if (!entry) return <CircleDashed size={13} aria-hidden="true" />;
  if (entry.status === 'running') {
    return <LoaderCircle size={13} className="spin" aria-hidden="true" />;
  }
  if (entry.status === 'failed') return <CircleExclamationPoint size={13} aria-hidden="true" />;
  return <CircleCheck size={13} aria-hidden="true" />;
}

interface ScreenshotCardProps {
  screenshot: Screenshot;
  ocr: OcrEntry | undefined;
  index: number;
  total: number;
  onMove: (id: string, toIndex: number) => void;
  onRemove: (id: string) => void;
}

export function ScreenshotCard({
  screenshot,
  ocr,
  index,
  total,
  onMove,
  onRemove,
}: ScreenshotCardProps) {
  const { id, fileName, format, sizeBytes, width, height, thumbnailUrl, source } = screenshot;
  const position = index + 1;
  const sourceUrl = source ? pageUrlForExport(source.url) : '';

  return (
    <li className="shot-card">
      <div className="shot-thumb">
        <img src={thumbnailUrl} alt={`Screenshot ${position}: ${fileName}`} />
        <span className="shot-index" aria-hidden="true">
          {position}
        </span>
        {/* Shown on hover and on keyboard focus, so every action stays reachable. */}
        <div className="shot-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label={`Move ${fileName} earlier`}
            title="Move earlier"
            disabled={index === 0}
            onClick={() => onMove(id, index - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Move ${fileName} later`}
            title="Move later"
            disabled={index === total - 1}
            onClick={() => onMove(id, index + 1)}
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className="icon-btn is-destructive"
            aria-label={`Remove ${fileName}`}
            title="Remove"
            onClick={() => onRemove(id)}
          >
            <Trash size={15} />
          </button>
        </div>
      </div>
      <div className="shot-info">
        <p className="shot-name" title={fileName}>
          {fileName}
        </p>
        <p className="shot-meta">
          {width} × {height} · {formatBytes(sizeBytes)} · {FORMAT_LABELS[format]}
        </p>
        {sourceUrl && (
          <p className="shot-source" title={sourceUrl}>
            <Globe size={12} aria-hidden="true" />
            Captured from {new URL(sourceUrl).host}
          </p>
        )}
        <p className="shot-ocr" data-status={ocr?.status ?? 'none'} title={ocr?.error}>
          <OcrIcon entry={ocr} />
          {describeOcr(ocr)}
        </p>
      </div>
    </li>
  );
}
