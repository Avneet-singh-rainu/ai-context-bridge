import {
  checkFileBeforeRead,
  checkImageSize,
  detectImageFormat,
  type ImageFormat,
  type ImportCandidate,
  MIME_TYPES,
  readImageSize,
  SCREENSHOT_LIMITS,
} from './image-validation';

export interface Screenshot {
  id: string;
  /** The original file, kept unchanged for OCR in Milestone 3. */
  file: File;
  fileName: string;
  format: ImageFormat;
  mimeType: string;
  sizeBytes: number;
  lastModified: number;
  width: number;
  height: number;
  /** A small WEBP data URL; the CSP already allows `data:` images. */
  thumbnailUrl: string;
}

export interface RejectedFile {
  id: string;
  fileName: string;
  reason: string;
}

export interface ImportResult {
  added: Screenshot[];
  rejected: RejectedFile[];
}

/** Thumbnails fit inside this box: about twice the shown size, so they stay sharp on HiDPI. */
const THUMBNAIL_BOX = { width: 480, height: 360 };

/** An error whose message is safe to show to the user. */
class ImportError extends Error {}

let idCounter = 0;
/** Ids only need to be unique for this app session. */
function nextId(): string {
  idCounter += 1;
  return `import-${idCounter}`;
}

function toCandidate(screenshot: Screenshot): ImportCandidate {
  return {
    name: screenshot.fileName,
    size: screenshot.sizeBytes,
    lastModified: screenshot.lastModified,
  };
}

async function makeThumbnail(image: ImageBitmap): Promise<string> {
  const scale = Math.min(1, THUMBNAIL_BOX.width / image.width, THUMBNAIL_BOX.height / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const small = await createImageBitmap(image, {
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: 'high',
  });
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new ImportError('A thumbnail could not be made.');
    context.drawImage(small, 0, 0);
    return canvas.toDataURL('image/webp', 0.85);
  } finally {
    small.close();
  }
}

async function readScreenshot(file: File): Promise<Screenshot> {
  const header = new Uint8Array(await file.slice(0, SCREENSHOT_LIMITS.headerBytes).arrayBuffer());
  const format = detectImageFormat(header);
  if (!format) throw new ImportError('The file is not a PNG, JPG, or WEBP image.');

  const headerSize = readImageSize(header, format);
  if (!headerSize) throw new ImportError('The image size could not be read.');
  const sizeProblem = checkImageSize(headerSize);
  if (sizeProblem) throw new ImportError(sizeProblem);

  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file);
  } catch {
    throw new ImportError('The image is damaged and could not be decoded.');
  }
  try {
    return {
      id: nextId(),
      file,
      fileName: file.name,
      format,
      mimeType: MIME_TYPES[format],
      sizeBytes: file.size,
      lastModified: file.lastModified,
      // The decoded size follows the photo's EXIF rotation; the header size does not.
      width: image.width,
      height: image.height,
      thumbnailUrl: await makeThumbnail(image),
    };
  } finally {
    image.close();
  }
}

/**
 * Checks and reads each file in order. One file at a time on purpose: only one full-size image
 * is decoded at once, which keeps memory use bounded.
 */
export async function importScreenshots(
  files: readonly File[],
  existing: readonly Screenshot[],
): Promise<ImportResult> {
  const added: Screenshot[] = [];
  const rejected: RejectedFile[] = [];

  for (const file of files) {
    const known = [...existing, ...added].map(toCandidate);
    const problem = checkFileBeforeRead(file, known);
    if (problem) {
      rejected.push({ id: nextId(), fileName: file.name, reason: problem });
      continue;
    }
    try {
      added.push(await readScreenshot(file));
    } catch (error) {
      const reason = error instanceof ImportError ? error.message : 'The image could not be read.';
      rejected.push({ id: nextId(), fileName: file.name, reason });
    }
  }

  return { added, rejected };
}
