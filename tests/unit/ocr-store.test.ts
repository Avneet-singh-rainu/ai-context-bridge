import { describe, expect, it } from 'vitest';
import {
  needsExtraction,
  type OcrState,
  ocrReducer,
} from '../../src/renderer/src/features/screenshots/ocr-store';
import type { OcrResult } from '../../src/shared/ipc-contract';

const result: OcrResult = { engine: 'windows', text: 'Total: 12', lineCount: 1, durationMs: 900 };

describe('ocrReducer', () => {
  it('stores text by screenshot id through start and succeed', () => {
    let state: OcrState = {};
    state = ocrReducer(state, { type: 'start', id: 'a' });
    expect(state.a.status).toBe('running');
    state = ocrReducer(state, { type: 'succeed', id: 'a', result });
    expect(state.a).toMatchObject({
      status: 'done',
      engine: 'windows',
      extractedText: 'Total: 12',
      text: 'Total: 12',
    });
  });

  it('records a failure for one screenshot without touching others', () => {
    let state: OcrState = ocrReducer({}, { type: 'succeed', id: 'a', result });
    state = ocrReducer(state, { type: 'fail', id: 'b', error: 'timed out' });
    expect(state.b).toMatchObject({ status: 'failed', error: 'timed out' });
    expect(state.a.status).toBe('done');
  });

  it('keeps edits separate from the extracted text and can restore it', () => {
    let state = ocrReducer({}, { type: 'succeed', id: 'a', result });
    state = ocrReducer(state, { type: 'edit', id: 'a', text: 'Total: 12 EUR' });
    expect(state.a).toMatchObject({ text: 'Total: 12 EUR', extractedText: 'Total: 12' });
    state = ocrReducer(state, { type: 'restore', id: 'a' });
    expect(state.a.text).toBe('Total: 12');
  });

  it('ignores edits before text exists and forgets removed screenshots', () => {
    const running = ocrReducer({}, { type: 'start', id: 'a' });
    expect(ocrReducer(running, { type: 'edit', id: 'a', text: 'x' })).toBe(running);
    expect(ocrReducer(running, { type: 'forget', id: 'a' })).toEqual({});
    expect(ocrReducer(running, { type: 'forget', id: 'zzz' })).toBe(running);
  });
});

describe('needsExtraction', () => {
  it('is true for new and failed screenshots only', () => {
    expect(needsExtraction(undefined)).toBe(true);
    expect(needsExtraction(ocrReducer({}, { type: 'fail', id: 'a', error: 'x' }).a)).toBe(true);
    expect(needsExtraction(ocrReducer({}, { type: 'start', id: 'a' }).a)).toBe(false);
    expect(needsExtraction(ocrReducer({}, { type: 'succeed', id: 'a', result }).a)).toBe(false);
  });
});
