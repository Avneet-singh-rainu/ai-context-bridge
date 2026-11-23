// Image format facts shared by the renderer (import checks) and the main process (OCR checks).
// Pure functions only: no DOM and no Node APIs.

export type ImageFormat = 'png' | 'jpeg' | 'webp';

/** Largest screenshot the app accepts, in bytes. The OCR handler applies the same limit. */
export const MAX_SCREENSHOT_BYTES = 20 * 1024 * 1024;

export const MIME_TYPES: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export const FILE_EXTENSIONS: Record<ImageFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function startsWith(bytes: Uint8Array, expected: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + expected.length) return false;
  return expected.every((value, index) => bytes[offset + index] === value);
}

export function ascii(text: string): number[] {
  return Array.from(text, (char) => char.charCodeAt(0));
}

/**
 * Finds the real image format from the file signature (magic bytes). The extension and the
 * browser's `file.type` come from the filename only, so neither is trusted.
 */
export function detectImageFormat(header: Uint8Array): ImageFormat | null {
  if (startsWith(header, PNG_SIGNATURE)) return 'png';
  if (startsWith(header, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(header, ascii('RIFF')) && startsWith(header, ascii('WEBP'), 8)) return 'webp';
  return null;
}
