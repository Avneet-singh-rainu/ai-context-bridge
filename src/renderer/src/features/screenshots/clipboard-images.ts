// Turns clipboard image items into Files that can enter the normal import checks.
// The shapes below are the parts of ClipboardData used here, so Vitest can test this in Node.

import { FILE_EXTENSIONS, type ImageFormat, MIME_TYPES } from '../../../../shared/image-format';

export interface ClipboardImageItem {
  kind: string;
  type: string;
  getAsFile(): File | null;
}

export interface ClipboardImageData {
  items: ArrayLike<ClipboardImageItem>;
}

const FORMAT_BY_MIME = new Map(
  (Object.entries(MIME_TYPES) as [ImageFormat, string][]).map(([format, mime]) => [mime, format]),
);

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function pastedName(format: ImageFormat, position: number, at: Date): string {
  const stamp =
    `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-` +
    `${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}${pad(at.getMilliseconds())}`;
  return `pasted-${stamp}-${position + 1}.${FILE_EXTENSIONS[format]}`;
}

/**
 * Clipboard images often arrive as `image.png` with the same name and time. Give each pasted
 * image a unique name so the duplicate check does not reject the second image in one paste.
 */
export function imageFilesFromClipboard(data: ClipboardImageData, at = new Date()): File[] {
  const files: File[] = [];
  for (const [position, item] of Array.from(data.items).entries()) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (!file) continue;
    const mime = file.type || item.type;
    const format = FORMAT_BY_MIME.get(mime);
    if (!format) continue;
    files.push(
      new File([file], pastedName(format, position, at), {
        type: mime,
        lastModified: file.lastModified || at.getTime(),
      }),
    );
  }
  return files;
}
