import { isAllowedPageUrl } from '../../shared/address';
import type { PageExtractResponse } from '../../shared/ipc-contract';
import type { CdpPage } from './chrome-cdp';
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

/** Reads the Chrome page's content in an isolated world, then limits and redacts it in main. */
export async function readCdpPage(page: CdpPage, url: string): Promise<PageExtractResponse> {
  if (!isAllowedPageUrl(url)) return { ok: false, error: 'Only http and https pages can be read.' };

  let raw: unknown;
  try {
    raw = await withTimeout(page.evaluateIsolated(EXTRACT_WORLD_ID, EXTRACT_SCRIPT), TIMEOUT_MS);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `The page content could not be read: ${message}.` };
  }

  const sanitized = sanitizeExtraction(raw);
  if (!sanitized.ok) return sanitized;
  return { ok: true, page: buildPageExtract(sanitized, url, new Date()) };
}
