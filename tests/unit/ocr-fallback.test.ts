import { describe, expect, it } from 'vitest';
import {
  normalizeOcrText,
  type OcrProvider,
  recognizeWithFallback,
} from '../../src/main/ocr/recognize';

const working = (id: OcrProvider['id'], text: string, confidence?: number): OcrProvider => ({
  id,
  recognize: async () => ({ text, confidence }),
});

const failing = (id: OcrProvider['id'], message: string): OcrProvider => ({
  id,
  recognize: async () => {
    throw new Error(message);
  },
});

describe('normalizeOcrText', () => {
  it('trims line ends, drops outer blank lines, and keeps at most one blank line', () => {
    expect(normalizeOcrText('\r\n  Total: 12  \r\n\r\n\r\n\r\nPaid \n\n')).toBe(
      '  Total: 12\n\nPaid',
    );
  });

  it('returns an empty string when there is no text', () => {
    expect(normalizeOcrText(' \n \n')).toBe('');
  });
});

describe('recognizeWithFallback', () => {
  it('uses the first engine when it works', async () => {
    const response = await recognizeWithFallback(
      [working('windows', 'Hello\nWorld'), working('tesseract', 'unused')],
      'image.png',
    );
    expect(response).toMatchObject({
      ok: true,
      result: { engine: 'windows', text: 'Hello\nWorld', lineCount: 2 },
    });
    expect(response.ok && response.result.fallbackReason).toBeFalsy();
  });

  it('falls back to the next engine and says why', async () => {
    const response = await recognizeWithFallback(
      [failing('windows', 'No Windows OCR language is installed.'), working('tesseract', 'Hi', 91)],
      'image.png',
    );
    expect(response).toMatchObject({
      ok: true,
      result: {
        engine: 'tesseract',
        text: 'Hi',
        confidence: 91,
        fallbackReason: 'Windows OCR failed: No Windows OCR language is installed.',
      },
    });
  });

  it('keeps an empty result instead of falling back', async () => {
    const response = await recognizeWithFallback(
      [working('windows', '  \n'), working('tesseract', 'should not run')],
      'image.png',
    );
    expect(response).toMatchObject({
      ok: true,
      result: { engine: 'windows', text: '', lineCount: 0 },
    });
  });

  it('reports every failure when no engine works', async () => {
    const response = await recognizeWithFallback(
      [failing('windows', 'timed out'), failing('tesseract', 'model missing')],
      'image.png',
    );
    expect(response).toEqual({
      ok: false,
      error: 'Text extraction failed. Windows OCR: timed out. Tesseract: model missing.',
    });
  });
});
