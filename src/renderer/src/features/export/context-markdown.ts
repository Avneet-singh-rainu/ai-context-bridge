// Builds the Markdown context package. Pure function, so Vitest can test it in Node.

import { pageUrlForExport } from '../../../../shared/address';
import type { ImageFormat } from '../../../../shared/image-format';
import { OCR_ENGINE_LABELS, type ScreenshotSource } from '../../../../shared/ipc-contract';
import type { OcrEntry } from '../screenshots/ocr-store';

export interface PackageScreenshot {
  fileName: string;
  format: ImageFormat;
  width: number;
  height: number;
  ocr?: OcrEntry;
  /** Set for browser captures: the page the screenshot was taken from. */
  source?: ScreenshotSource;
}

/** "Title (origin/path)" without the query string, or whichever part exists. */
function sourcePage(source: ScreenshotSource): string {
  const url = pageUrlForExport(source.url);
  const title = source.title.trim();
  if (title && url && title !== source.url) return `${title} (${url})`;
  return url || title;
}

const FORMAT_LABELS: Record<ImageFormat, string> = { png: 'PNG', jpeg: 'JPG', webp: 'WEBP' };

const pad = (value: number) => String(value).padStart(2, '0');

function localDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function suggestedFileName(createdAt: Date): string {
  return `context-package-${localDate(createdAt)}-${localTime(createdAt).replace(':', '')}.md`;
}

/** A code fence longer than any run of backticks inside the text, so the text cannot close it. */
function fenced(text: string): string {
  const longestRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  return `${fence}text\n${text}\n${fence}`;
}

type TextState = 'text' | 'empty' | 'removed' | 'missing' | 'failed';

function textState(ocr: OcrEntry | undefined): TextState {
  if (!ocr || ocr.status === 'running') return 'missing';
  if (ocr.status === 'failed') return 'failed';
  if (ocr.text.trim() !== '') return 'text';
  return ocr.extractedText.trim() === '' ? 'empty' : 'removed';
}

function textSource(ocr: OcrEntry | undefined): string {
  if (ocr?.status !== 'done' || !ocr.engine) return 'none';
  let source = OCR_ENGINE_LABELS[ocr.engine];
  if (ocr.confidence !== undefined) source += `, ${Math.round(ocr.confidence)}% confidence`;
  if (ocr.fallbackReason) source += ` (${ocr.fallbackReason})`;
  if (ocr.text !== ocr.extractedText) source += ', edited by the user';
  return source;
}

const MISSING_NOTES: Partial<Record<TextState, string>> = {
  empty: 'no text was found.',
  removed: 'the user removed the extracted text.',
  missing: 'text was not extracted.',
  failed: 'text extraction failed.',
};

export function buildContextMarkdown(
  screenshots: readonly PackageScreenshot[],
  createdAt: Date,
): string {
  const states = screenshots.map((shot) => textState(shot.ocr));
  const engines = [
    ...new Set(
      screenshots.flatMap((shot) =>
        shot.ocr?.status === 'done' && shot.ocr.engine ? [OCR_ENGINE_LABELS[shot.ocr.engine]] : [],
      ),
    ),
  ];
  const allRun = states.every((state) => state !== 'missing' && state !== 'failed');

  const lines: string[] = [
    '# Context Package',
    '',
    '## Capture information',
    '',
    `- Created: ${localDate(createdAt)} ${localTime(createdAt)}`,
    `- Screenshots: ${screenshots.length}`,
  ];
  if (engines.length > 0) {
    lines.push(
      `- Text extraction: done on this PC with ${engines.join(' and ')}. No AI service was used.`,
    );
  }
  if (!allRun) lines.push('- Text extraction: not run for every screenshot.');

  lines.push('', '## Screenshots');
  screenshots.forEach((shot, index) => {
    const state = states[index];
    lines.push(
      '',
      `### Screenshot ${index + 1}: ${shot.fileName}`,
      '',
      `- Image: ${shot.width} x ${shot.height} ${FORMAT_LABELS[shot.format]}`,
      ...(shot.source ? [`- Source page: ${sourcePage(shot.source)}`] : []),
      `- Text source: ${textSource(shot.ocr)}`,
      '',
    );
    if (state === 'text' && shot.ocr) lines.push('Extracted text:', '', fenced(shot.ocr.text));
    else if (state === 'empty') lines.push('Extracted text: none found.');
    else if (state === 'removed') lines.push('Extracted text: removed by the user.');
    else if (state === 'failed')
      lines.push(`Extracted text: extraction failed (${shot.ocr?.error}).`);
    else lines.push('Extracted text: not extracted yet.');
  });

  lines.push(
    '',
    '## Missing or uncertain information',
    '',
    '- Text was read by OCR and may contain recognition errors. Check numbers and names against ' +
      'the screenshots.',
    '- Only text was extracted. Charts, colors, layout, and other visual details are not described.',
  );
  states.forEach((state, index) => {
    const note = MISSING_NOTES[state];
    if (note) lines.push(`- Screenshot ${index + 1}: ${note}`);
  });

  lines.push('', '## Source references', '');
  screenshots.forEach((shot, index) => {
    const engine =
      shot.ocr?.status === 'done' && shot.ocr.engine
        ? `, text by ${OCR_ENGINE_LABELS[shot.ocr.engine]}`
        : '';
    const pageUrl = shot.source ? pageUrlForExport(shot.source.url) : '';
    const from = pageUrl ? `, captured from ${pageUrl}` : '';
    lines.push(
      `- Screenshot ${index + 1}: ${shot.fileName}, ${shot.width} x ${shot.height} ` +
        `${FORMAT_LABELS[shot.format]}${engine}${from}`,
    );
  });

  return `${lines.join('\n')}\n`;
}
