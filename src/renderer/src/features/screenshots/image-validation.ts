// Pure checks for screenshot import. No DOM types here, so Vitest can run these in Node.

import {
  ascii,
  type ImageFormat,
  MAX_SCREENSHOT_BYTES,
  startsWith,
} from '../../../../shared/image-format';

export {
  detectImageFormat,
  type ImageFormat,
  MIME_TYPES,
} from '../../../../shared/image-format';

export interface ImageSize {
  width: number;
  height: number;
}

/** The file facts needed before reading any bytes. A browser File has all three. */
export interface ImportCandidate {
  name: string;
  size: number;
  lastModified: number;
}

export const SCREENSHOT_LIMITS = {
  maxFiles: 20,
  maxFileBytes: MAX_SCREENSHOT_BYTES,
  maxPixels: 50_000_000,
  /** Bytes read from the start of a file to find its format and size. */
  headerBytes: 1024 * 1024,
} as const;

/** Value for the file input's `accept` attribute. */
export const ACCEPTED_FILE_TYPES = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';

function be16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function be32(bytes: Uint8Array, offset: number): number {
  // Multiply instead of `<< 24`, which turns a high first byte into a negative number.
  return bytes[offset] * 0x1000000 + ((bytes[offset + 1] << 16) | be16(bytes, offset + 2));
}

function le16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function le24(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readPngSize(bytes: Uint8Array): ImageSize | null {
  // Signature (8), IHDR length (4), "IHDR" (4), width (4), height (4).
  if (bytes.length < 24 || !startsWith(bytes, ascii('IHDR'), 12)) return null;
  return { width: be32(bytes, 16), height: be32(bytes, 20) };
}

/** SOF markers carry the frame size. 0xC4 (DHT), 0xC8 (JPG) and 0xCC (DAC) share the range. */
function isStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
}

function readJpegSize(bytes: Uint8Array): ImageSize | null {
  let pos = 2; // Skip SOI (FF D8).
  while (pos + 3 < bytes.length) {
    if (bytes[pos] !== 0xff) return null;
    const marker = bytes[pos + 1];
    if (marker === 0xff) {
      pos += 1; // Fill byte.
      continue;
    }
    // Markers without a length field: TEM and RST0-RST7.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      pos += 2;
      continue;
    }
    // EOI or start of scan before any frame header: no size to find.
    if (marker === 0xd9 || marker === 0xda) return null;
    const length = be16(bytes, pos + 2);
    if (length < 2) return null;
    if (isStartOfFrame(marker)) {
      // Length (2), precision (1), height (2), width (2).
      if (pos + 9 > bytes.length) return null;
      return { width: be16(bytes, pos + 7), height: be16(bytes, pos + 5) };
    }
    pos += 2 + length;
  }
  return null;
}

function readWebpSize(bytes: Uint8Array): ImageSize | null {
  // "RIFF", size, "WEBP", then the first chunk's id at 12 and its payload at 20.
  if (bytes.length < 30) return null;
  if (startsWith(bytes, ascii('VP8X'), 12)) {
    return { width: le24(bytes, 24) + 1, height: le24(bytes, 27) + 1 };
  }
  if (startsWith(bytes, ascii('VP8L'), 12)) {
    if (bytes[20] !== 0x2f) return null;
    const [b0, b1, b2, b3] = [bytes[21], bytes[22], bytes[23], bytes[24]];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  if (startsWith(bytes, ascii('VP8 '), 12)) {
    if (!startsWith(bytes, [0x9d, 0x01, 0x2a], 23)) return null;
    return { width: le16(bytes, 26) & 0x3fff, height: le16(bytes, 28) & 0x3fff };
  }
  return null;
}

/**
 * Reads the width and height from the file header, before any decoding. That stops a small
 * file that would decode into a huge image from using a lot of memory.
 */
export function readImageSize(header: Uint8Array, format: ImageFormat): ImageSize | null {
  if (format === 'png') return readPngSize(header);
  if (format === 'jpeg') return readJpegSize(header);
  return readWebpSize(header);
}

/** Returns a reason to reject the image, or null when the size is fine. */
export function checkImageSize(size: ImageSize): string | null {
  if (size.width < 1 || size.height < 1) return 'The image size could not be read.';
  if (size.width * size.height > SCREENSHOT_LIMITS.maxPixels) {
    const megapixels = Math.round((size.width * size.height) / 1_000_000);
    return `The image is ${megapixels} megapixels; the limit is 50 megapixels.`;
  }
  return null;
}

/**
 * Checks that need no file bytes. `existing` holds the screenshots already imported plus the
 * files accepted earlier in the same batch.
 */
export function checkFileBeforeRead(
  candidate: ImportCandidate,
  existing: readonly ImportCandidate[],
): string | null {
  if (existing.length >= SCREENSHOT_LIMITS.maxFiles) {
    return `The limit of ${SCREENSHOT_LIMITS.maxFiles} screenshots is reached.`;
  }
  if (candidate.size === 0) return 'The file is empty.';
  if (candidate.size > SCREENSHOT_LIMITS.maxFileBytes) return 'The file is larger than 20 MB.';
  const isDuplicate = existing.some(
    (other) =>
      other.name === candidate.name &&
      other.size === candidate.size &&
      other.lastModified === candidate.lastModified,
  );
  if (isDuplicate) return 'This file is already imported.';
  return null;
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
}
