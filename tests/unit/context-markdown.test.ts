import { describe, expect, it } from 'vitest';
import {
  buildContextMarkdown,
  type PackageScreenshot,
  suggestedFileName,
} from '../../src/renderer/src/features/export/context-markdown';

const createdAt = new Date(2026, 10, 23, 6, 15);

const shot = (fileName: string, ocr?: PackageScreenshot['ocr']): PackageScreenshot => ({
  fileName,
  format: 'png',
  width: 1920,
  height: 1080,
  ocr,
});

const done = (text: string, extra: Partial<NonNullable<PackageScreenshot['ocr']>> = {}) => ({
  status: 'done' as const,
  engine: 'windows' as const,
  extractedText: text,
  text,
  ...extra,
});

describe('buildContextMarkdown', () => {
  it('lists screenshots in order with their text in fenced blocks', () => {
    const markdown = buildContextMarkdown(
      [shot('dashboard.png', done('Revenue: 1,200')), shot('chart.png', done('Q4 up 8%'))],
      createdAt,
    );
    expect(markdown).toContain('# Context Package');
    expect(markdown).toContain('- Created: 2026-11-23 06:15');
    expect(markdown).toContain('- Screenshots: 2');
    expect(markdown).toContain('No AI service was used.');
    expect(markdown.indexOf('### Screenshot 1: dashboard.png')).toBeLessThan(
      markdown.indexOf('### Screenshot 2: chart.png'),
    );
    expect(markdown).toContain('```text\nRevenue: 1,200\n```');
    expect(markdown).toContain('- Text source: Windows OCR');
  });

  it('uses the edited text and says so', () => {
    const markdown = buildContextMarkdown(
      [shot('a.png', done('Totl 12', { text: 'Total 12' }))],
      createdAt,
    );
    expect(markdown).toContain('```text\nTotal 12\n```');
    expect(markdown).toContain('- Text source: Windows OCR, edited by the user');
  });

  it('names the fallback engine, its confidence, and why', () => {
    const markdown = buildContextMarkdown(
      [
        shot(
          'a.png',
          done('Hi', {
            engine: 'tesseract',
            confidence: 87.4,
            fallbackReason: 'Windows OCR failed: too large',
          }),
        ),
      ],
      createdAt,
    );
    expect(markdown).toContain(
      '- Text source: Tesseract, 87% confidence (Windows OCR failed: too large)',
    );
  });

  it('never drops a screenshot silently: empty, missing, and failed text are listed', () => {
    const markdown = buildContextMarkdown(
      [
        shot('empty.png', done('')),
        shot('new.png'),
        shot('bad.png', { status: 'failed', extractedText: '', text: '', error: 'timed out' }),
      ],
      createdAt,
    );
    expect(markdown).toContain('Extracted text: none found.');
    expect(markdown).toContain('Extracted text: not extracted yet.');
    expect(markdown).toContain('Extracted text: extraction failed (timed out).');
    expect(markdown).toContain('- Screenshot 1: no text was found.');
    expect(markdown).toContain('- Screenshot 2: text was not extracted.');
    expect(markdown).toContain('- Screenshot 3: text extraction failed.');
    expect(markdown).toContain('- Text extraction: not run for every screenshot.');
  });

  it('always warns that OCR text can be wrong and that visuals are not described', () => {
    const markdown = buildContextMarkdown([shot('a.png', done('x'))], createdAt);
    expect(markdown).toContain('may contain recognition errors');
    expect(markdown).toContain('Charts, colors, layout');
  });

  it('uses a longer fence when the text itself contains backticks', () => {
    const markdown = buildContextMarkdown([shot('a.png', done('run ```npm test```'))], createdAt);
    expect(markdown).toContain('````text\nrun ```npm test```\n````');
  });
});

describe('suggestedFileName', () => {
  it('includes the date and time', () => {
    expect(suggestedFileName(createdAt)).toBe('context-package-2026-11-23-0615.md');
  });
});
