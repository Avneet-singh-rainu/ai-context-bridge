import { dirname, join } from 'node:path';
import { createWorker, OEM, type Worker } from 'tesseract.js';
import type { OcrProvider } from './recognize';

/**
 * The English LSTM model ships in @tesseract.js-data/eng, so nothing is downloaded. Without
 * `langPath`, tesseract.js would fetch the model from a CDN. Electron lets the worker thread
 * read this folder from inside app.asar, so the packaged app needs no unpacked files.
 */
function englishModelFolder(): string {
  return join(dirname(require.resolve('@tesseract.js-data/eng/package.json')), '4.0.0_best_int');
}

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  workerPromise ??= createWorker('eng', OEM.LSTM_ONLY, {
    langPath: englishModelFolder(),
    gzip: true,
    // The model is read from disk each start; no cache file is written anywhere.
    cacheMethod: 'none',
  }).catch((error: unknown) => {
    workerPromise = null;
    throw error;
  });
  return workerPromise;
}

/** Stops the Tesseract worker thread. Called when the app quits. */
export async function stopTesseract(): Promise<void> {
  const pending = workerPromise;
  workerPromise = null;
  if (pending) await (await pending).terminate().catch(() => undefined);
}

/** Tesseract (WebAssembly) in a Node worker thread with the bundled English model. */
export const tesseractOcrProvider: OcrProvider = {
  id: 'tesseract',
  async recognize(imagePath) {
    const worker = await getWorker();
    const { data } = await worker.recognize(imagePath);
    return { text: data.text, confidence: data.confidence };
  },
};
