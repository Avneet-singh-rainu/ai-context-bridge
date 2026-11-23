// Checks for IPC payloads. Main treats every renderer message as untrusted input.
// No Electron imports, so Vitest can test these in Node.

import { basename } from 'node:path';
import { detectImageFormat, type ImageFormat, MAX_SCREENSHOT_BYTES } from '../shared/image-format';

export const MAX_CONTEXT_PACKAGE_CHARS = 5 * 1024 * 1024;
const DEFAULT_PACKAGE_NAME = 'context-package.md';

type Parsed<T> = ({ ok: true } & T) | { ok: false; error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseOcrRequest(
  request: unknown,
): Parsed<{ bytes: Uint8Array; format: ImageFormat }> {
  if (!isObject(request) || !(request.bytes instanceof Uint8Array)) {
    return { ok: false, error: 'The request did not contain image bytes.' };
  }
  const { bytes } = request;
  if (bytes.byteLength > MAX_SCREENSHOT_BYTES) {
    return { ok: false, error: 'The image is larger than 20 MB.' };
  }
  const format = detectImageFormat(bytes);
  if (!format) return { ok: false, error: 'The file is not a PNG, JPG, or WEBP image.' };
  return { ok: true, bytes, format };
}

export function parseSaveRequest(
  request: unknown,
): Parsed<{ markdown: string; suggestedName: string }> {
  if (!isObject(request) || typeof request.markdown !== 'string') {
    return { ok: false, error: 'The request did not contain a context package.' };
  }
  if (request.markdown.length > MAX_CONTEXT_PACKAGE_CHARS) {
    return { ok: false, error: 'The context package is larger than 5 MB.' };
  }
  const suggestedName = typeof request.suggestedName === 'string' ? request.suggestedName : '';
  return { ok: true, markdown: request.markdown, suggestedName };
}

const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i;

/** Turns a suggested name into a safe Windows file name: no folders, no forbidden characters. */
export function sanitizeFileName(name: unknown): string {
  if (typeof name !== 'string') return DEFAULT_PACKAGE_NAME;
  const lastPart = basename(name.replace(/\\/g, '/'));
  const cleaned = lastPart
    // biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are what this strips.
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/, '')
    .trim();
  if (cleaned === '' || RESERVED_WINDOWS_NAMES.test(cleaned)) return DEFAULT_PACKAGE_NAME;
  return /\.(md|txt)$/i.test(cleaned) ? cleaned : `${cleaned}.md`;
}
