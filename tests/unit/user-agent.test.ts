import { describe, expect, it } from 'vitest';
import { plainChromeUserAgent } from '../../src/main/browser/user-agent';

describe('plainChromeUserAgent', () => {
  it('drops the app and Electron tokens and keeps the Chrome ones', () => {
    const electron =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'AIContextBridge/0.1.0 Chrome/156.0.8078.100 Electron/45.4.1 Safari/537.36';
    expect(plainChromeUserAgent(electron)).toBe(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/156.0.8078.100 Safari/537.36',
    );
  });

  it('leaves a plain Chrome user agent unchanged', () => {
    const chrome =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/156.0.0.0 Safari/537.36';
    expect(plainChromeUserAgent(chrome)).toBe(chrome);
  });
});
