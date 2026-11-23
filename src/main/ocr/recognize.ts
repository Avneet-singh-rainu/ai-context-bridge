// Engine-independent OCR logic: the provider interface, text clean-up, and the fallback chain.
// No Electron imports, so Vitest can test it with fake providers.

import { OCR_ENGINE_LABELS, type OcrEngineId, type OcrResponse } from '../../shared/ipc-contract';

/** One OCR engine. Add an engine by implementing this and adding it to the provider list. */
export interface OcrProvider {
  id: OcrEngineId;
  /** Reads text from an image file. Throws with a short, user-readable message on failure. */
  recognize(imagePath: string): Promise<{ text: string; confidence?: number }>;
}

/** Unifies line endings, trims line ends, and keeps at most one blank line in a row. */
export function normalizeOcrText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.trim().replace(/\.$/, '') || 'unknown error';
}

/**
 * Tries each provider in order and returns the first result, even an empty one: an image with
 * no text is a valid answer, not a failure. Later providers run only when an earlier one throws.
 */
export async function recognizeWithFallback(
  providers: readonly OcrProvider[],
  imagePath: string,
  now: () => number = Date.now,
): Promise<OcrResponse> {
  const failures: string[] = [];

  for (const provider of providers) {
    const started = now();
    try {
      const output = await provider.recognize(imagePath);
      const text = normalizeOcrText(output.text);
      return {
        ok: true,
        result: {
          engine: provider.id,
          text,
          lineCount: text === '' ? 0 : text.split('\n').filter((line) => line.trim()).length,
          durationMs: Math.round(now() - started),
          ...(output.confidence === undefined ? {} : { confidence: output.confidence }),
          ...(failures.length > 0
            ? { fallbackReason: failures.map((failure) => `${failure}.`).join(' ') }
            : {}),
        },
      };
    } catch (error) {
      failures.push(`${OCR_ENGINE_LABELS[provider.id]} failed: ${errorMessage(error)}`);
    }
  }

  const details = failures.map((failure) => `${failure.replace(' failed:', ':')}.`).join(' ');
  return { ok: false, error: `Text extraction failed. ${details}` };
}
