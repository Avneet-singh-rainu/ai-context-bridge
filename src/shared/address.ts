// Address bar and page URL rules for the built-in browser. Pure functions shared by main (which
// enforces them) and the renderer (which shows them). No DOM and no Node APIs.

export type AddressResult =
  | { ok: true; kind: 'url' | 'search'; url: string }
  | { ok: false; error: string };

export type PageSecurity = 'secure' | 'local' | 'not-secure';

const SEARCH_URL = 'https://duckduckgo.com/';
const SCHEME_ERROR = 'Only http and https pages can be opened.';

function parseUrl(text: string): URL | null {
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

/** localhost, *.localhost, loopback, and private IPv4 ranges. */
function isLocalHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1') return true;
  return /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
}

/** A host the user plausibly meant: localhost, an IP address, or a name ending in a letter TLD. */
function isPlausibleHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname.startsWith('[')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  const labels = hostname.split('.');
  return labels.length > 1 && /[a-z]/i.test(labels[labels.length - 1]);
}

function searchFor(text: string): AddressResult {
  const url = new URL(SEARCH_URL);
  url.searchParams.set('q', text);
  return { ok: true, kind: 'search', url: url.href };
}

export function isAllowedPageUrl(url: string): boolean {
  const parsed = parseUrl(url);
  return parsed !== null && (parsed.protocol === 'http:' || parsed.protocol === 'https:');
}

/**
 * Turns address bar text into a URL to load: a full http(s) URL, a bare host (https, or http for
 * local hosts), or a DuckDuckGo search for anything else. Other schemes are refused.
 */
export function parseAddress(input: string): AddressResult {
  const text = input.trim();
  if (text === '') return { ok: false, error: 'Enter a web address or words to search for.' };

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(text)) {
    const url = parseUrl(text);
    if (!url || !isAllowedPageUrl(url.href)) return { ok: false, error: SCHEME_ERROR };
    return { ok: true, kind: 'url', url: url.href };
  }
  if (/\s/.test(text)) return searchFor(text);
  // "scheme:something" with no port number after the colon, such as javascript: or mailto:.
  if (/^[a-z][a-z\d+.-]*:(?!\d)/i.test(text)) return { ok: false, error: SCHEME_ERROR };

  const hostPart = text.split(/[/?#]/)[0];
  const looksLikeHost = hostPart.includes('.') || /^(localhost|\[)/i.test(hostPart);
  if (looksLikeHost) {
    // Judge the host as typed: the URL parser would turn "3.14" into the IP address 3.0.0.14.
    const typedHost = hostPart.replace(/:\d+$/, '').toLowerCase();
    const probe = parseUrl(`http://${text}`);
    if (probe && isPlausibleHost(typedHost)) {
      const scheme = isLocalHost(probe.hostname) ? 'http' : 'https';
      const url = parseUrl(`${scheme}://${text}`);
      if (url) return { ok: true, kind: 'url', url: url.href };
    }
  }
  return searchFor(text);
}

export function pageSecurity(url: string): PageSecurity {
  const parsed = parseUrl(url);
  if (parsed?.protocol === 'https:') return 'secure';
  if (parsed?.protocol === 'http:' && isLocalHost(parsed.hostname)) return 'local';
  return 'not-secure';
}

/** Origin and path only: query strings and fragments often carry tokens or personal data. */
export function pageUrlForExport(url: string): string {
  const parsed = parseUrl(url);
  if (!parsed || !isAllowedPageUrl(parsed.href)) return '';
  return `${parsed.origin}${parsed.pathname}`;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** File name for a page capture: the host plus the local date and time. */
export function captureFileName(url: string, at: Date): string {
  const stamp =
    `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}-` +
    `${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`;
  const parsed = parseUrl(url);
  const host =
    parsed && isAllowedPageUrl(parsed.href) ? parsed.hostname.replace(/[[\]:]/g, '') : '';
  return host ? `page-${host}-${stamp}.png` : `page-${stamp}.png`;
}
