import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app } from 'electron';
import { FILE_EXTENSIONS } from '../../shared/image-format';
import type { OcrResponse } from '../../shared/ipc-contract';
import { parseOcrRequest } from '../ipc-requests';
import { type OcrProvider, recognizeWithFallback } from './recognize';
import { tesseractOcrProvider } from './tesseract-ocr';
import { windowsOcrProvider } from './windows-ocr';

/** Windows OCR first; Tesseract only when Windows OCR fails or is not available. */
const PROVIDERS: readonly OcrProvider[] = [windowsOcrProvider, tesseractOcrProvider];

// One OCR job at a time, even if several requests arrive together.
let queue: Promise<unknown> = Promise.resolve();

function runInQueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

/**
 * Handles one `ocr:recognize` request. The bytes are written to a private temporary folder,
 * because Windows OCR reads from a file; the folder is deleted when the job ends.
 */
export function recognizeImage(request: unknown): Promise<OcrResponse> {
  const parsed = parseOcrRequest(request);
  if (!parsed.ok) return Promise.resolve({ ok: false, error: parsed.error });

  return runInQueue(async () => {
    const folder = await mkdtemp(join(app.getPath('temp'), 'ai-context-bridge-ocr-'));
    try {
      const imagePath = join(folder, `screenshot.${FILE_EXTENSIONS[parsed.format]}`);
      await writeFile(imagePath, parsed.bytes);
      return await recognizeWithFallback(PROVIDERS, imagePath);
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });
}
