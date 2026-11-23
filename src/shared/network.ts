// Network capture rules shared by main (which captures) and the renderer (which reviews).
// Pure functions only: no DOM and no Node APIs.

export const NETWORK_LIMITS = {
  /** Distinct responses kept per app run; later ones are counted, not stored. */
  maxEntries: 200,
  /** Largest body read; bigger bodies keep metadata only. */
  maxBodyBytes: 1_048_576,
  /** Characters kept per response after pruning. */
  maxKeptChars: 8_000,
  maxArrayItems: 3,
  maxObjectKeys: 50,
  maxStringChars: 200,
  maxDepth: 6,
} as const;

export type ResponseKind = 'json' | 'text';

/** One captured API endpoint; repeated calls to the same method and endpoint are merged. */
export interface NetworkEntry {
  id: string;
  method: string;
  /** Origin and path; query values are never kept. */
  endpoint: string;
  /** Names of query parameters seen on this endpoint, without their values. */
  queryKeys: string[];
  status: number;
  mimeType: string;
  /** `none` when the body was not kept (too large or unavailable); see `note`. */
  kind: ResponseKind | 'none';
  calls: number;
  /** Size of the newest body before pruning, in bytes. */
  originalBytes: number;
  /** The newest body after pruning and secret redaction. */
  text: string;
  /** True when pruning or the character cap removed anything. */
  truncated: boolean;
  redactions: number;
  note?: string;
  /** The page that made the newest call. */
  pageUrl: string;
  /** ISO 8601 time of the newest call. */
  lastAt: string;
}

export interface NetworkState {
  recording: boolean;
  /** ISO 8601 time recording started. */
  startedAt?: string;
  /** The site being recorded; navigating to another origin stops recording. */
  origin?: string;
  /** API responses kept or merged while recording. */
  seen: number;
  /** Responses that were not API calls or not JSON or text. */
  ignored: number;
  failed: number;
  /** New endpoints dropped after the entry limit. */
  skipped: number;
  entries: NetworkEntry[];
  notice?: { kind: 'info' | 'error'; text: string };
}

export const NO_NETWORK: NetworkState = {
  recording: false,
  seen: 0,
  ignored: 0,
  failed: 0,
  skipped: 0,
  entries: [],
};

/** Origin and path plus the query key names; null for anything but http and https. */
export function endpointParts(url: string): { endpoint: string; queryKeys: string[] } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return {
    endpoint: `${parsed.origin}${parsed.pathname}`,
    queryKeys: [...new Set(parsed.searchParams.keys())],
  };
}

/** API traffic: XHR and Fetch, plus Other (beacons and some API clients). */
export function isApiResource(resourceType: string | undefined): boolean {
  return resourceType === 'XHR' || resourceType === 'Fetch' || resourceType === 'Other';
}

export function responseKind(mimeType: string): ResponseKind | null {
  const mime = mimeType.toLowerCase().split(';')[0].trim();
  if (mime === 'application/json' || mime.endsWith('+json')) return 'json';
  if (mime === 'text/plain' || mime === 'text/csv') return 'text';
  return null;
}

interface PruneOptions {
  arrayItems: number;
  stringChars: number;
}

const BASE64 = /^[A-Za-z0-9+/_-]{120,}={0,2}$/;

/** Long base64 mixes upper case, lower case, and digits; a run of one letter is not base64. */
function looksLikeBase64(value: string): boolean {
  return BASE64.test(value) && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
}

function pruneValue(
  value: unknown,
  depth: number,
  options: PruneOptions,
  flags: { pruned: boolean },
) {
  if (typeof value === 'string') {
    if (value.startsWith('data:') && value.length > 60) {
      flags.pruned = true;
      return `(data URL, ${value.length} characters, removed)`;
    }
    if (looksLikeBase64(value)) {
      flags.pruned = true;
      return `(base64 data, ${value.length} characters, removed)`;
    }
    if (value.length > options.stringChars) {
      flags.pruned = true;
      return `${value.slice(0, options.stringChars)}... (+${value.length - options.stringChars} characters)`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (depth >= NETWORK_LIMITS.maxDepth) {
      flags.pruned = true;
      return `(array of ${value.length} items)`;
    }
    const kept: unknown[] = value
      .slice(0, options.arrayItems)
      .map((item) => pruneValue(item, depth + 1, options, flags));
    if (value.length > options.arrayItems) {
      flags.pruned = true;
      kept.push(`(+${value.length - options.arrayItems} more items)`);
    }
    return kept;
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value);
    if (depth >= NETWORK_LIMITS.maxDepth) {
      flags.pruned = true;
      return `(object with ${keys.length} keys)`;
    }
    const out: Record<string, unknown> = {};
    for (const key of keys.slice(0, NETWORK_LIMITS.maxObjectKeys)) {
      out[key] = pruneValue((value as Record<string, unknown>)[key], depth + 1, options, flags);
    }
    if (keys.length > NETWORK_LIMITS.maxObjectKeys) {
      flags.pruned = true;
      out['(more keys)'] = `+${keys.length - NETWORK_LIMITS.maxObjectKeys}`;
    }
    return out;
  }
  return value;
}

/**
 * Keeps the shape of JSON and drops the bulk: arrays keep their first items plus a count, long
 * strings are cut, base64 and data URLs are removed, and deep nesting is summarized.
 */
export function pruneJson(
  value: unknown,
  options: PruneOptions = {
    arrayItems: NETWORK_LIMITS.maxArrayItems,
    stringChars: NETWORK_LIMITS.maxStringChars,
  },
): { value: unknown; pruned: boolean } {
  const flags = { pruned: false };
  return { value: pruneValue(value, 0, options, flags), pruned: flags.pruned };
}

/** Cuts text at the last line break before the cap and says how much was left out. */
function capText(text: string): { text: string; cut: boolean } {
  const cap = NETWORK_LIMITS.maxKeptChars;
  if (text.length <= cap) return { text, cut: false };
  const lastBreak = text.lastIndexOf('\n', cap);
  const end = lastBreak > cap * 0.5 ? lastBreak : cap;
  return {
    text: `${text.slice(0, end)}\n... (cut: ${text.length - end} more characters)`,
    cut: true,
  };
}

/**
 * Reduces a response body to at most NETWORK_LIMITS.maxKeptChars characters. JSON is pruned by
 * structure (a second, tighter pass if still too long) so it stays valid; other text is cut at
 * a line break. JSON that does not parse is treated as text.
 */
export function reduceBody(body: string, kind: ResponseKind): { text: string; truncated: boolean } {
  if (kind === 'json') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = undefined;
    }
    if (parsed !== undefined) {
      let pruned = pruneJson(parsed);
      let text = JSON.stringify(pruned.value, null, 2);
      if (text.length > NETWORK_LIMITS.maxKeptChars) {
        pruned = pruneJson(parsed, { arrayItems: 1, stringChars: 80 });
        text = JSON.stringify(pruned.value, null, 2);
      }
      const capped = capText(text);
      return { text: capped.text, truncated: pruned.pruned || capped.cut };
    }
  }
  const capped = capText(body.replace(/\r\n?/g, '\n'));
  return { text: capped.text, truncated: capped.cut };
}
