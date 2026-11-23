import { describe, expect, it } from 'vitest';
import { parseOcrRequest, parseSaveRequest, sanitizeFileName } from '../../src/main/ipc-requests';
import { MAX_SCREENSHOT_BYTES } from '../../src/shared/image-format';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

describe('parseOcrRequest', () => {
  it('accepts image bytes and finds the format from the signature', () => {
    expect(parseOcrRequest({ bytes: PNG })).toEqual({ ok: true, bytes: PNG, format: 'png' });
  });

  it('rejects anything that is not image bytes within the size limit', () => {
    expect(parseOcrRequest(null)).toMatchObject({ ok: false });
    expect(parseOcrRequest({ bytes: 'C:\\Windows\\win.ini' })).toMatchObject({ ok: false });
    expect(parseOcrRequest({ bytes: new TextEncoder().encode('not an image') })).toEqual({
      ok: false,
      error: 'The file is not a PNG, JPG, or WEBP image.',
    });
    const tooBig = new Uint8Array(MAX_SCREENSHOT_BYTES + 1);
    tooBig.set(PNG);
    expect(parseOcrRequest({ bytes: tooBig })).toEqual({
      ok: false,
      error: 'The image is larger than 20 MB.',
    });
  });
});

describe('parseSaveRequest', () => {
  it('accepts Markdown text and a file name', () => {
    expect(parseSaveRequest({ markdown: '# Context', suggestedName: 'a.md' })).toEqual({
      ok: true,
      markdown: '# Context',
      suggestedName: 'a.md',
    });
  });

  it('rejects a missing or oversized package', () => {
    expect(parseSaveRequest({ suggestedName: 'a.md' })).toMatchObject({ ok: false });
    expect(
      parseSaveRequest({ markdown: 'x'.repeat(5 * 1024 * 1024 + 1), suggestedName: 'a.md' }),
    ).toEqual({
      ok: false,
      error: 'The context package is larger than 5 MB.',
    });
  });
});

describe('sanitizeFileName', () => {
  it('keeps a plain file name and adds .md when missing', () => {
    expect(sanitizeFileName('context-package-2026-11-23.md')).toBe('context-package-2026-11-23.md');
    expect(sanitizeFileName('notes')).toBe('notes.md');
  });

  it('strips folders and characters Windows does not allow', () => {
    expect(sanitizeFileName('..\\..\\Windows\\evil:name?.md')).toBe('evil-name-.md');
    expect(sanitizeFileName('C:/Users/x/report.md')).toBe('report.md');
  });

  it('falls back to a default name', () => {
    expect(sanitizeFileName('')).toBe('context-package.md');
    expect(sanitizeFileName(42)).toBe('context-package.md');
  });
});
