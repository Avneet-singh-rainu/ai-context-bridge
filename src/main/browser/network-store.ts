// Merges captured responses into network entries. No Electron imports, so Vitest can test it.

import {
  endpointParts,
  NETWORK_LIMITS,
  type NetworkEntry,
  type NetworkState,
  reduceBody,
  responseKind,
} from '../../shared/network';
import { redactSecrets } from '../../shared/redact';

/** One finished API response, as main captured it. */
export interface CapturedResponse {
  method: string;
  url: string;
  status: number;
  mimeType: string;
  /** The decoded body; undefined when it was too large or unavailable (see `note`). */
  body?: string;
  bodyBytes: number;
  note?: string;
  pageUrl: string;
  at: string;
}

/**
 * Adds a response: a call to an endpoint already seen (same method, origin, and path) replaces
 * that entry's body with the newest one and counts the call; a new endpoint becomes a new entry,
 * unless the entry limit is reached. The kept text is pruned, then redacted.
 */
export function addResponse(
  state: NetworkState,
  response: CapturedResponse,
  nextId: () => string,
): NetworkState {
  const parts = endpointParts(response.url);
  const kind = responseKind(response.mimeType);
  if (!parts || !kind) return { ...state, ignored: state.ignored + 1 };

  let text = '';
  let truncated = false;
  let redactions = 0;
  if (response.body !== undefined) {
    const reduced = reduceBody(response.body, kind);
    const redacted = redactSecrets(reduced.text);
    text = redacted.text;
    truncated = reduced.truncated;
    redactions = redacted.count;
  }

  const method = response.method.toUpperCase();
  const fields = {
    status: response.status,
    mimeType: response.mimeType,
    kind: response.body === undefined ? ('none' as const) : kind,
    originalBytes: response.bodyBytes,
    text,
    truncated,
    redactions,
    note: response.note,
    pageUrl: response.pageUrl,
    lastAt: response.at,
  };

  const index = state.entries.findIndex(
    (entry) => entry.method === method && entry.endpoint === parts.endpoint,
  );
  if (index >= 0) {
    const current = state.entries[index];
    const merged: NetworkEntry = {
      ...current,
      ...fields,
      queryKeys: [...new Set([...current.queryKeys, ...parts.queryKeys])],
      calls: current.calls + 1,
    };
    const entries = [...state.entries];
    entries[index] = merged;
    return { ...state, seen: state.seen + 1, entries };
  }

  if (state.entries.length >= NETWORK_LIMITS.maxEntries) {
    return { ...state, seen: state.seen + 1, skipped: state.skipped + 1 };
  }
  const entry: NetworkEntry = {
    id: nextId(),
    method,
    endpoint: parts.endpoint,
    queryKeys: parts.queryKeys,
    calls: 1,
    ...fields,
  };
  return { ...state, seen: state.seen + 1, entries: [...state.entries, entry] };
}
