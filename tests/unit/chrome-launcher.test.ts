import { describe, expect, it, vi } from 'vitest';
import {
  CHROME_OVERRIDE_ENV,
  chromeCandidates,
  chromeLaunchArgs,
  clearStaleDevToolsPort,
  findChromeExecutable,
  parseDevToolsActivePort,
  waitForDevToolsEndpoint,
} from '../../src/main/browser/chrome-launcher';

describe('chromeCandidates', () => {
  it('uses the standard Windows paths and the local app data path', () => {
    const candidates = chromeCandidates({
      PROGRAMFILES: 'C:\\Program Files',
      'PROGRAMFILES(X86)': 'C:\\Program Files (x86)',
      LOCALAPPDATA: 'C:\\Users\\Test\\AppData\\Local',
    });

    expect(candidates).toEqual([
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Users\\Test\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    ]);
  });
});

describe('findChromeExecutable', () => {
  it('prefers an existing override path', () => {
    const exists = vi.fn((value: string) => value === 'D:\\Tools\\chrome.exe');
    const found = findChromeExecutable({ [CHROME_OVERRIDE_ENV]: 'D:\\Tools\\chrome.exe' }, exists);

    expect(found).toBe('D:\\Tools\\chrome.exe');
    expect(exists).toHaveBeenCalledTimes(1);
  });

  it('falls back to the first standard path that exists', () => {
    const candidates = chromeCandidates({
      PROGRAMFILES: 'C:\\Program Files',
      'PROGRAMFILES(X86)': 'C:\\Program Files (x86)',
      LOCALAPPDATA: 'C:\\Users\\Test\\AppData\\Local',
    });
    const exists = vi.fn((value: string) => value === candidates[1]);
    const found = findChromeExecutable({}, exists);

    expect(found).toBe(candidates[1]);
  });

  it('returns null when no path exists', () => {
    expect(findChromeExecutable({}, () => false)).toBeNull();
  });
});

describe('chromeLaunchArgs', () => {
  it('starts headless Chrome with a fresh debugging port and the app profile', () => {
    const args = chromeLaunchArgs('C:\\AppData\\chrome-profile');

    expect(args).toContain('--headless=new');
    expect(args).toContain('--disable-blink-features=AutomationControlled');
    expect(args).toContain('--remote-debugging-port=0');
    expect(args).toContain('--user-data-dir=C:\\AppData\\chrome-profile');
    // No broad origin flag: a Node WebSocket sends no Origin header, so Chrome accepts it.
    expect(args).not.toContain('--remote-allow-origins=*');
  });
});

describe('parseDevToolsActivePort', () => {
  it('parses the port and browser socket path', () => {
    const endpoint = parseDevToolsActivePort('51234\r\n/devtools/browser/abc-123\r\n');

    expect(endpoint.port).toBe(51234);
    expect(endpoint.browserPath).toBe('/devtools/browser/abc-123');
    expect(endpoint.webSocketDebuggerUrl).toBe('ws://127.0.0.1:51234/devtools/browser/abc-123');
  });

  it('rejects an invalid port', () => {
    expect(() => parseDevToolsActivePort('not-a-port\n/devtools/browser/abc')).toThrow(
      'invalid debugging port',
    );
  });
});

describe('clearStaleDevToolsPort', () => {
  it('removes the port file left by a previous Chrome session', async () => {
    const removeFile = vi.fn(async (_filePath: string): Promise<void> => undefined);

    await clearStaleDevToolsPort('C:\\AppData\\chrome-profile', removeFile);

    expect(removeFile).toHaveBeenCalledWith('C:\\AppData\\chrome-profile\\DevToolsActivePort');
  });
});

describe('waitForDevToolsEndpoint', () => {
  it('polls until Chrome writes a valid endpoint', async () => {
    const readTextFile = vi
      .fn(async (_filePath: string, _encoding: 'utf8'): Promise<string> => '')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('54321\n/devtools/browser/ready\n');
    const sleep = vi.fn(async (_ms: number): Promise<void> => undefined);

    const endpoint = await waitForDevToolsEndpoint(
      'C:\\AppData\\chrome-profile',
      1000,
      readTextFile,
      sleep,
    );

    expect(endpoint.port).toBe(54321);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('throws after the timeout when no file appears', async () => {
    const readTextFile = vi
      .fn(async (_filePath: string, _encoding: 'utf8'): Promise<string> => '')
      .mockRejectedValue(new Error('missing'));
    const sleep = vi.fn(async (_ms: number): Promise<void> => undefined);

    await expect(
      waitForDevToolsEndpoint('C:\\AppData\\chrome-profile', 0, readTextFile, sleep),
    ).rejects.toThrow('did not expose a debugging endpoint');
  });
});
