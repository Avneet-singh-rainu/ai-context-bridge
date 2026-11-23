import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

/** Environment override used when Chrome is installed outside the standard Windows locations. */
export const CHROME_OVERRIDE_ENV = 'AI_CONTEXT_BRIDGE_CHROME';

type ReadTextFile = (filePath: string, encoding: 'utf8') => Promise<string>;
type Sleep = (ms: number) => Promise<void>;

export interface DevToolsEndpoint {
  port: number;
  browserPath: string;
  webSocketDebuggerUrl: string;
}

export interface ChromeSession {
  executable: string;
  profileDir: string;
  endpoint: DevToolsEndpoint;
  pid?: number;
  stop: () => void;
}

export interface LaunchChromeOptions {
  userDataPath: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  fileExists?: (filePath: string) => boolean;
  readTextFile?: ReadTextFile;
  sleep?: Sleep;
}

/** Standard Windows install locations, plus the per-user install under LocalAppData. */
export function chromeCandidates(env: NodeJS.ProcessEnv = process.env): string[] {
  const programFiles = env.PROGRAMFILES || 'C:\\Program Files';
  const programFilesX86 = env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
  const candidates = [
    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];
  if (env.LOCALAPPDATA) {
    candidates.push(path.join(env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'));
  }
  return candidates;
}

/** Honour the explicit override first, then walk the standard locations in order. */
export function findChromeExecutable(
  env: NodeJS.ProcessEnv = process.env,
  fileExists: (filePath: string) => boolean = existsSync,
): string | null {
  const override = env[CHROME_OVERRIDE_ENV];
  if (override && fileExists(override)) return override;
  return chromeCandidates(env).find(fileExists) ?? null;
}

/** Hide the automation flag that sites read through navigator.webdriver. */
export function chromeLaunchArgs(profileDir: string): string[] {
  return [
    '--headless=new',
    '--disable-blink-features=AutomationControlled',
    // Google sign-in otherwise opens chrome://signin-dice-web-intercept.top-chrome, which the
    // app cannot show and which stalls the account sign-in flow.
    '--disable-features=SigninInterception',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-crash-restore-bubble',
    'about:blank',
  ];
}

/** Chrome writes the chosen port and browser socket path into DevToolsActivePort. */
export function parseDevToolsActivePort(contents: string): DevToolsEndpoint {
  const [portLine, pathLine] = contents.trim().split(/\r?\n/);
  const port = Number(portLine);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Chrome returned an invalid debugging port.');
  }
  const browserPath = (pathLine ?? '').trim() || '/devtools/browser';
  if (!browserPath.startsWith('/')) {
    throw new Error('Chrome returned an invalid debugging path.');
  }
  return {
    port,
    browserPath,
    webSocketDebuggerUrl: `ws://127.0.0.1:${port}${browserPath}`,
  };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Remove a port file left by a previous Chrome session so no dead port is read. */
export async function clearStaleDevToolsPort(
  profileDir: string,
  removeFile: (filePath: string) => Promise<void> = async (filePath) =>
    rm(filePath, { force: true }),
): Promise<void> {
  await removeFile(path.join(profileDir, 'DevToolsActivePort'));
}

/** Poll for the debugging endpoint. Chrome writes the file shortly after the process starts. */
export async function waitForDevToolsEndpoint(
  profileDir: string,
  timeoutMs = 10000,
  readTextFile: ReadTextFile = readFile,
  sleep: Sleep = defaultSleep,
): Promise<DevToolsEndpoint> {
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const contents = await readTextFile(portFile, 'utf8');
      if (contents.trim()) return parseDevToolsActivePort(contents);
    } catch {
      // Chrome has not written the file yet. The loop retries until the deadline.
    }
    await sleep(100);
  }
  throw new Error('Chrome did not expose a debugging endpoint in time.');
}

/** Start headless Chrome with a profile the app owns, and read its debugging endpoint. */
export async function launchChrome(options: LaunchChromeOptions): Promise<ChromeSession> {
  const env = options.env ?? process.env;
  const executable = findChromeExecutable(env, options.fileExists);
  if (!executable) {
    throw new Error(
      'Google Chrome was not found. Install Chrome to open pages with Google sign-in.',
    );
  }

  const profileDir = path.join(options.userDataPath, 'chrome-profile');
  await mkdir(profileDir, { recursive: true });
  await clearStaleDevToolsPort(profileDir);

  const child = spawn(executable, chromeLaunchArgs(profileDir), {
    stdio: 'ignore',
    windowsHide: true,
  });
  const stop = () => {
    if (!child.killed) child.kill();
  };
  const spawnFailure = new Promise<never>((_resolve, reject) => {
    child.once('error', reject);
  });

  try {
    const endpoint = await Promise.race([
      waitForDevToolsEndpoint(
        profileDir,
        options.timeoutMs,
        options.readTextFile,
        options.sleep ?? defaultSleep,
      ),
      spawnFailure,
    ]);
    return { executable, profileDir, endpoint, pid: child.pid, stop };
  } catch (error) {
    stop();
    throw error;
  }
}
