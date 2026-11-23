import { describe, expect, it } from 'vitest';
import { addResponse, type CapturedResponse } from '../../src/main/browser/network-store';
import {
  endpointParts,
  isApiResource,
  NETWORK_LIMITS,
  NO_NETWORK,
  pruneJson,
  reduceBody,
  responseKind,
} from '../../src/shared/network';

describe('endpointParts', () => {
  it('keeps origin and path, and only the names of query parameters', () => {
    expect(endpointParts('https://api.shop.example/v1/orders?page=2&token=abc&page=3')).toEqual({
      endpoint: 'https://api.shop.example/v1/orders',
      queryKeys: ['page', 'token'],
    });
    expect(endpointParts('data:application/json,{}')).toBeNull();
    expect(endpointParts('not a url')).toBeNull();
  });
});

describe('isApiResource and responseKind', () => {
  it('keeps XHR, Fetch, and Other requests with JSON or text content', () => {
    expect(['XHR', 'Fetch', 'Other'].map(isApiResource)).toEqual([true, true, true]);
    expect(['Document', 'Script', 'Image', 'Font', undefined].map(isApiResource)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(responseKind('application/json; charset=utf-8')).toBe('json');
    expect(responseKind('application/problem+json')).toBe('json');
    expect(responseKind('text/csv')).toBe('text');
    expect(responseKind('text/html')).toBeNull();
    expect(responseKind('image/png')).toBeNull();
  });
});

describe('pruneJson', () => {
  it('keeps the shape and drops the bulk', () => {
    const big = {
      total: 120,
      items: Array.from({ length: 120 }, (_, i) => ({ id: i, name: `Item ${i}` })),
      avatar: `data:image/png;base64,${'A'.repeat(200)}`,
      blob: 'QUJDRGVmZ2gxMjM0'.repeat(25),
      bio: 'x'.repeat(250),
    };
    const { value, pruned } = pruneJson(big);
    expect(pruned).toBe(true);
    expect(value).toEqual({
      total: 120,
      items: [
        { id: 0, name: 'Item 0' },
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        '(+117 more items)',
      ],
      avatar: `(data URL, ${big.avatar.length} characters, removed)`,
      blob: '(base64 data, 400 characters, removed)',
      bio: `${'x'.repeat(200)}... (+50 characters)`,
    });
  });

  it('summarizes deep nesting and leaves small JSON alone', () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } };
    expect(JSON.stringify(pruneJson(deep).value)).toContain('(object with 1 keys)');
    expect(pruneJson({ ok: true, items: [1, 2] })).toEqual({
      value: { ok: true, items: [1, 2] },
      pruned: false,
    });
  });
});

describe('reduceBody', () => {
  it('keeps pruned JSON valid and under the cap', () => {
    const rows = Array.from({ length: 5000 }, (_, i) => ({ id: i, text: 'y'.repeat(150) }));
    const { text, truncated } = reduceBody(JSON.stringify({ rows }), 'json');
    expect(truncated).toBe(true);
    expect(text.length).toBeLessThanOrEqual(NETWORK_LIMITS.maxKeptChars);
    expect(() => JSON.parse(text)).not.toThrow();
  });

  it('cuts long text at a line break and treats broken JSON as text', () => {
    const csv = Array.from({ length: 2000 }, (_, i) => `row ${i},value`).join('\n');
    const reduced = reduceBody(csv, 'text');
    expect(reduced.truncated).toBe(true);
    expect(reduced.text).toMatch(/row \d+,value\n\.\.\. \(cut: \d+ more characters\)$/);
    expect(reduceBody('{"broken": ', 'json')).toEqual({ text: '{"broken": ', truncated: false });
  });
});

describe('addResponse', () => {
  let counter = 0;
  const nextId = () => `n${++counter}`;
  const response = (overrides: Partial<CapturedResponse> = {}): CapturedResponse => ({
    method: 'get',
    url: 'https://api.example.com/orders?page=1',
    status: 200,
    mimeType: 'application/json',
    body: '{"orders":[1,2]}',
    bodyBytes: 16,
    pageUrl: 'https://shop.example/orders',
    at: '2026-11-23T08:00:00.000Z',
    ...overrides,
  });

  it('merges repeated calls to the same endpoint and keeps the newest body', () => {
    let state = addResponse(NO_NETWORK, response(), nextId);
    state = addResponse(
      state,
      response({ url: 'https://api.example.com/orders?page=2&sort=new', body: '{"orders":[3]}' }),
      nextId,
    );
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0]).toMatchObject({
      method: 'GET',
      endpoint: 'https://api.example.com/orders',
      queryKeys: ['page', 'sort'],
      calls: 2,
      text: '{\n  "orders": [\n    3\n  ]\n}',
    });
    expect(state.seen).toBe(2);
  });

  it('redacts secrets in the kept text and counts them', () => {
    const state = addResponse(
      NO_NETWORK,
      response({ body: '{"user":"ana","api_key":"abcd1234efgh5678"}' }),
      nextId,
    );
    expect(state.entries[0].text).toContain('"api_key": "[REDACTED]"');
    expect(state.entries[0].redactions).toBe(1);
  });

  it('keeps metadata only when there is no body, and ignores non-API content', () => {
    let state = addResponse(
      NO_NETWORK,
      response({ body: undefined, bodyBytes: 5_000_000, note: 'Larger than 1 MB.' }),
      nextId,
    );
    expect(state.entries[0]).toMatchObject({ kind: 'none', text: '', note: 'Larger than 1 MB.' });
    state = addResponse(state, response({ mimeType: 'text/html' }), nextId);
    expect(state.ignored).toBe(1);
  });

  it('stops adding new endpoints at the limit but keeps merging known ones', () => {
    let state = NO_NETWORK;
    for (let i = 0; i < NETWORK_LIMITS.maxEntries; i++) {
      state = addResponse(state, response({ url: `https://api.example.com/e${i}` }), nextId);
    }
    state = addResponse(state, response({ url: 'https://api.example.com/new' }), nextId);
    state = addResponse(state, response({ url: 'https://api.example.com/e0' }), nextId);
    expect(state.entries).toHaveLength(NETWORK_LIMITS.maxEntries);
    expect(state.skipped).toBe(1);
    expect(state.entries[0].calls).toBe(2);
  });
});
