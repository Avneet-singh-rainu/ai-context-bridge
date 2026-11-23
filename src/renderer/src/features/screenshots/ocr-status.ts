import { OCR_ENGINE_LABELS } from '../../../../shared/ipc-contract';
import type { OcrEntry } from './ocr-store';

/** One short line describing a screenshot's OCR state, for cards and text editors. */
export function describeOcr(entry: OcrEntry | undefined): string {
  if (!entry) return 'Text not extracted';
  if (entry.status === 'running') return 'Extracting text...';
  if (entry.status === 'failed') return 'Text extraction failed';
  const engine = entry.engine ? OCR_ENGINE_LABELS[entry.engine] : 'OCR';
  const via = entry.fallbackReason ? `${engine} (fallback)` : engine;
  if (entry.extractedText === '') return `No text found - ${via}`;
  const lines = entry.extractedText.split('\n').filter((line) => line.trim()).length;
  const edited = entry.text !== entry.extractedText ? ', edited' : '';
  return `${lines} ${lines === 1 ? 'line' : 'lines'} - ${via}${edited}`;
}
