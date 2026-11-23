import { describe, expect, it } from 'vitest';
import {
  checkFileBeforeRead,
  checkImageSize,
  detectImageFormat,
  formatBytes,
  type ImportCandidate,
  readImageSize,
  SCREENSHOT_LIMITS,
} from '../../src/renderer/src/features/screenshots/image-validation';

/** Builds a byte array from numbers and ASCII strings, padded with zeros to `length`. */
function bytes(parts: Array<number | string>, length = 64): Uint8Array {
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    if (typeof part === 'number') {
      out[offset++] = part;
    } else {
      for (const char of part) out[offset++] = char.charCodeAt(0);
    }
  }
  return out;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** PNG header: signature, IHDR chunk length (13), "IHDR", width and height as big-endian. */
function pngHeader(width: number, height: number): Uint8Array {
  const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  return bytes([...PNG_SIGNATURE, 0, 0, 0, 13, 'IHDR', ...be32(width), ...be32(height)]);
}

/** JPEG: SOI, an APP0 segment of 16 bytes, then an SOF0 segment with height and width. */
function jpegHeader(width: number, height: number, sofMarker = 0xc0): Uint8Array {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 'JFIF', 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sof = [0xff, sofMarker, 0x00, 0x11, 8, height >> 8, height & 255, width >> 8, width & 255];
  return bytes([0xff, 0xd8, ...app0, ...sof]);
}

function webpHeader(chunk: string, payload: number[]): Uint8Array {
  return bytes(['RIFF', 0, 0, 0, 0, 'WEBP', chunk, 0, 0, 0, 0, ...payload]);
}

describe('detectImageFormat', () => {
  it('reads PNG, JPEG and WEBP signatures', () => {
    expect(detectImageFormat(pngHeader(1, 1))).toBe('png');
    expect(detectImageFormat(jpegHeader(1, 1))).toBe('jpeg');
    expect(detectImageFormat(webpHeader('VP8X', []))).toBe('webp');
  });

  it('rejects other content even when it is named like an image', () => {
    expect(detectImageFormat(bytes(['hello, this is a text file']))).toBeNull();
    expect(detectImageFormat(bytes(['GIF89a']))).toBeNull();
    expect(detectImageFormat(bytes(['RIFF', 0, 0, 0, 0, 'WAVE']))).toBeNull();
    expect(detectImageFormat(new Uint8Array(0))).toBeNull();
  });
});

describe('readImageSize', () => {
  it('reads the PNG size from the IHDR chunk', () => {
    expect(readImageSize(pngHeader(1920, 1080), 'png')).toEqual({ width: 1920, height: 1080 });
  });

  it('reads the JPEG size from the first SOF segment after other segments', () => {
    expect(readImageSize(jpegHeader(2560, 1440), 'jpeg')).toEqual({ width: 2560, height: 1440 });
    // SOF2 is a progressive JPEG.
    expect(readImageSize(jpegHeader(800, 600, 0xc2), 'jpeg')).toEqual({ width: 800, height: 600 });
  });

  it('does not treat a DHT segment (0xC4) as a size segment', () => {
    expect(readImageSize(jpegHeader(800, 600, 0xc4), 'jpeg')).toBeNull();
  });

  it('reads the WEBP size from VP8X, VP8L and VP8 chunks', () => {
    // VP8X: flags, 3 reserved bytes, then width-1 and height-1 as 24-bit little-endian.
    const vp8x = webpHeader('VP8X', [0, 0, 0, 0, 0x7f, 0x07, 0, 0x37, 0x04, 0]);
    expect(readImageSize(vp8x, 'webp')).toEqual({ width: 1920, height: 1080 });

    // VP8L: signature 0x2F, then 14 bits of width-1 and 14 bits of height-1.
    const w = 1919;
    const h = 1079;
    const vp8l = webpHeader('VP8L', [
      0x2f,
      w & 0xff,
      ((w >> 8) & 0x3f) | ((h & 0x03) << 6),
      (h >> 2) & 0xff,
      (h >> 10) & 0x0f,
    ]);
    expect(readImageSize(vp8l, 'webp')).toEqual({ width: 1920, height: 1080 });

    // VP8: 3-byte frame tag, start code 9D 01 2A, then 14-bit width and height, little-endian.
    const vp8 = webpHeader('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, 0x80, 0x07, 0x38, 0x04]);
    expect(readImageSize(vp8, 'webp')).toEqual({ width: 1920, height: 1080 });
  });

  it('returns null when the header is cut short', () => {
    expect(readImageSize(pngHeader(10, 10).slice(0, 20), 'png')).toBeNull();
    expect(readImageSize(bytes([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], 6), 'jpeg')).toBeNull();
    expect(readImageSize(webpHeader('VP8 ', [0, 0, 0, 0, 0, 0]), 'webp')).toBeNull();
  });
});

describe('checkImageSize', () => {
  it('accepts a normal screenshot and rejects empty or oversized images', () => {
    expect(checkImageSize({ width: 3840, height: 2160 })).toBeNull();
    expect(checkImageSize({ width: 0, height: 100 })).toMatch(/could not be read/i);
    expect(checkImageSize({ width: 10_000, height: 10_000 })).toMatch(/megapixels/);
  });
});

describe('checkFileBeforeRead', () => {
  const file = (name: string, size = 1000, lastModified = 1): ImportCandidate => ({
    name,
    size,
    lastModified,
  });

  it('accepts a normal file', () => {
    expect(checkFileBeforeRead(file('a.png'), [])).toBeNull();
  });

  it('rejects empty and too-large files', () => {
    expect(checkFileBeforeRead(file('a.png', 0), [])).toMatch(/empty/i);
    const tooBig = SCREENSHOT_LIMITS.maxFileBytes + 1;
    expect(checkFileBeforeRead(file('a.png', tooBig), [])).toMatch(/larger than 20 MB/);
  });

  it('rejects an exact duplicate of a file already imported', () => {
    expect(checkFileBeforeRead(file('a.png'), [file('a.png')])).toMatch(/already/i);
    expect(checkFileBeforeRead(file('a.png', 1000, 2), [file('a.png')])).toBeNull();
  });

  it('rejects files once the screenshot limit is reached', () => {
    const full = Array.from({ length: SCREENSHOT_LIMITS.maxFiles }, (_, i) => file(`${i}.png`));
    expect(checkFileBeforeRead(file('a.png'), full)).toMatch(/limit of 20/i);
  });
});

describe('formatBytes', () => {
  it('formats sizes for the thumbnail caption', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1_572_864)).toBe('1.5 MB');
  });
});
