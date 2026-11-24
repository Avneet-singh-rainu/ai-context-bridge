import { describe, expect, it } from 'vitest';
import {
  type ClipboardImageItem,
  imageFilesFromClipboard,
} from '../../src/renderer/src/features/screenshots/clipboard-images';

function item(kind: string, type: string, fileType = type): ClipboardImageItem {
  return {
    kind,
    type,
    getAsFile: () => new File([new Uint8Array([1, 2, 3])], 'image.png', { type: fileType }),
  };
}

describe('imageFilesFromClipboard', () => {
  it('keeps image files and gives each pasted image a unique name', () => {
    const at = new Date(2026, 0, 2, 3, 4, 5, 6);
    const files = imageFilesFromClipboard(
      {
        items: [item('file', 'image/png'), item('string', 'text/plain'), item('file', 'image/png')],
      },
      at,
    );

    expect(files).toHaveLength(2);
    expect(files.map((file) => file.name)).toEqual([
      'pasted-20260102-03040506-1.png',
      'pasted-20260102-03040506-3.png',
    ]);
    expect(files.every((file) => file.type === 'image/png')).toBe(true);
  });

  it('uses the clipboard item type when the File has no MIME type', () => {
    const files = imageFilesFromClipboard({ items: [item('file', 'image/webp', '')] });
    expect(files).toHaveLength(1);
    expect(files[0].type).toBe('image/webp');
    expect(files[0].name.endsWith('.webp')).toBe(true);
  });
});
