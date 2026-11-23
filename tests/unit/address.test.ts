import { describe, expect, it } from 'vitest';
import {
  captureFileName,
  isAllowedPageUrl,
  pageSecurity,
  pageUrlForExport,
  parseAddress,
} from '../../src/shared/address';

describe('parseAddress', () => {
  it('opens full http and https URLs as typed', () => {
    expect(parseAddress('https://example.com/a?b=1')).toEqual({
      ok: true,
      kind: 'url',
      url: 'https://example.com/a?b=1',
    });
    expect(parseAddress('  HTTP://Example.com  ')).toMatchObject({ url: 'http://example.com/' });
  });

  it('adds https to a bare host, and http to local hosts', () => {
    expect(parseAddress('example.com')).toMatchObject({ kind: 'url', url: 'https://example.com/' });
    expect(parseAddress('docs.example.co.uk/guide')).toMatchObject({
      url: 'https://docs.example.co.uk/guide',
    });
    expect(parseAddress('localhost:3000')).toMatchObject({ url: 'http://localhost:3000/' });
    expect(parseAddress('127.0.0.1:8080/test')).toMatchObject({
      url: 'http://127.0.0.1:8080/test',
    });
    expect(parseAddress('192.168.1.10')).toMatchObject({ url: 'http://192.168.1.10/' });
  });

  it('searches DuckDuckGo for words', () => {
    expect(parseAddress('hello world')).toEqual({
      ok: true,
      kind: 'search',
      url: 'https://duckduckgo.com/?q=hello+world',
    });
    expect(parseAddress('electron')).toMatchObject({ kind: 'search' });
    expect(parseAddress('3.14')).toMatchObject({ kind: 'search' });
    expect(parseAddress('note: buy milk')).toMatchObject({ kind: 'search' });
  });

  it('refuses other schemes', () => {
    const refused = { ok: false, error: 'Only http and https pages can be opened.' };
    expect(parseAddress('file:///C:/Windows/win.ini')).toEqual(refused);
    expect(parseAddress('javascript:alert(1)')).toEqual(refused);
    expect(parseAddress('chrome://settings')).toEqual(refused);
    expect(parseAddress('mailto:someone@example.com')).toEqual(refused);
  });

  it('asks for input when the box is empty', () => {
    expect(parseAddress('   ')).toEqual({
      ok: false,
      error: 'Enter a web address or words to search for.',
    });
  });
});

describe('isAllowedPageUrl', () => {
  it('allows only http and https', () => {
    expect(isAllowedPageUrl('https://example.com/')).toBe(true);
    expect(isAllowedPageUrl('http://localhost:3000/')).toBe(true);
    expect(isAllowedPageUrl('file:///C:/x.html')).toBe(false);
    expect(isAllowedPageUrl('data:text/html,hi')).toBe(false);
    expect(isAllowedPageUrl('ms-settings:privacy')).toBe(false);
    expect(isAllowedPageUrl('not a url')).toBe(false);
  });
});

describe('pageSecurity', () => {
  it('labels https as secure, local http as local, and other http as not secure', () => {
    expect(pageSecurity('https://example.com/')).toBe('secure');
    expect(pageSecurity('http://127.0.0.1:8080/')).toBe('local');
    expect(pageSecurity('http://example.com/')).toBe('not-secure');
  });
});

describe('pageUrlForExport', () => {
  it('keeps origin and path and drops the query and fragment', () => {
    expect(pageUrlForExport('https://shop.example/orders?id=7&token=abc#top')).toBe(
      'https://shop.example/orders',
    );
    expect(pageUrlForExport('about:blank')).toBe('');
    expect(pageUrlForExport('not a url')).toBe('');
  });
});

describe('captureFileName', () => {
  it('names a capture after the host and local time', () => {
    const at = new Date(2026, 10, 23, 6, 15, 9);
    expect(captureFileName('https://www.example.com/a?b=1', at)).toBe(
      'page-www.example.com-2026-11-23-061509.png',
    );
    expect(captureFileName('about:blank', at)).toBe('page-2026-11-23-061509.png');
  });
});
