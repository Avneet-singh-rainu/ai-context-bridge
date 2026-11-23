import type { WebContents } from 'electron';
import { isAllowedPageUrl } from '../../shared/address';
import type { PageExtractResponse } from '../../shared/ipc-contract';
import { buildPageExtract, sanitizeExtraction } from './page-result';
import { EXTRACT_SCRIPT, EXTRACT_WORLD_ID } from './page-script';

const TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no answer within ${ms / 1000} seconds`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Reads the active page's content in an isolated world, then limits and redacts it in main. */
export async function readPage(contents: WebContents): Promise<PageExtractResponse> {
  const url = contents.getURL();
  if (!isAllowedPageUrl(url)) return { ok: false, error: 'Only http and https pages can be read.' };
  if (contents.isLoading()) return { ok: false, error: 'Wait for the page to finish loading.' };

  let raw: unknown;
  try {
    raw = await withTimeout(
      contents.executeJavaScriptInIsolatedWorld(EXTRACT_WORLD_ID, [{ code: EXTRACT_SCRIPT }]),
      TIMEOUT_MS,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `The page content could not be read: ${message}.` };
  }
  if (contents.getURL() !== url) {
    return { ok: false, error: 'The page changed while it was being read. Try again.' };
  }

  const sanitized = sanitizeExtraction(raw);
  if (!sanitized.ok) return sanitized;
  return { ok: true, page: buildPageExtract(sanitized, url, new Date()) };
}
