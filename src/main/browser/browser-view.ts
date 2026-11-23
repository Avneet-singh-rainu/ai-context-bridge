import type { BrowserWindow } from 'electron';
import { app } from 'electron';
import { isAllowedPageUrl, pageSecurity, parseAddress } from '../../shared/address';
import { MAX_SCREENSHOT_BYTES } from '../../shared/image-format';
import {
  type BrowserBounds,
  type BrowserFrame,
  type BrowserInput,
  type BrowserState,
  type CaptureResponse,
  IPC_CHANNELS,
  type NavigateResponse,
  type PageExtractResponse,
} from '../../shared/ipc-contract';
import { CdpClient, type CdpPage, createCdpPage } from './chrome-cdp';
import { dispatchInput } from './chrome-input';
import { type ChromeSession, launchChrome } from './chrome-launcher';
import { readCdpPage } from './page-extract';

const MAX_ADDRESS_LENGTH = 4096;
const FRAME_PAUSE_MS = 150;
const FRAME_TIMEOUT_MS = 2_000;
const STATE_REFRESH_MS = 100;
const JPEG_QUALITY = 72;

let ownerWindow: BrowserWindow | null = null;
let chrome: ChromeSession | null = null;
let client: CdpClient | null = null;
let page: CdpPage | null = null;
let hasPage = false;
let currentUrl = '';
let currentTitle = '';
let isLoading = false;
let canGoBack = false;
let canGoForward = false;
let mainFrameId = '';
let notice: BrowserState['notice'];
let bounds: BrowserBounds = { x: 0, y: 0, width: 0, height: 0, visible: false };
let viewport = { width: 0, height: 0 };
let frameSequence = 0;
let frameTimer: NodeJS.Timeout | null = null;
let frameInFlight = false;
let frameGeneration = 0;
let stateRefreshTimer: NodeJS.Timeout | null = null;
let lastStateJson = '';
let starting: Promise<boolean> | null = null;
let disposed = false;

function currentState(): BrowserState {
  const url = hasPage ? currentUrl : '';
  return {
    hasPage,
    url,
    title: hasPage ? currentTitle : '',
    isLoading: hasPage && isLoading,
    canGoBack,
    canGoForward,
    security: pageSecurity(url),
    ...(notice ? { notice } : {}),
  };
}

/** Sends an event to the app UI, if its window is still open. */
export function sendToApp(channel: string, payload: unknown): void {
  if (ownerWindow && !ownerWindow.isDestroyed()) ownerWindow.webContents.send(channel, payload);
}

function pushState(): void {
  const state = currentState();
  const json = JSON.stringify(state);
  if (json === lastStateJson) return;
  lastStateJson = json;
  sendToApp(IPC_CHANNELS.browserState, state);
}

/** Batches CDP history reads raised by one navigation into one state update. */
function scheduleStateRefresh(): void {
  if (stateRefreshTimer) return;
  stateRefreshTimer = setTimeout(() => {
    stateRefreshTimer = null;
    scheduleStateRefresh();
  }, STATE_REFRESH_MS);
}

function setNotice(kind: 'error' | 'info', text: string): void {
  notice = { kind, text };
  pushState();
}

function clearNotice(): void {
  notice = undefined;
}

/** The active CDP page, used by network capture. */
export function getCdpPage(): CdpPage | null {
  return page && hasPage ? page : null;
}

/** The active page's URL, used by network capture to stop at a site change. */
export function getPageUrl(): string {
  return hasPage ? currentUrl : '';
}

async function refreshHistory(): Promise<void> {
  if (!page) return;
  try {
    const history = await page.history();
    canGoBack = history.currentIndex > 0;
    canGoForward = history.currentIndex < history.entries.length - 1;
  } catch {
    // A page closing during navigation leaves the old history flags in place.
  }
}

/** Listens for page events and keeps the state pushed to the renderer in step with Chrome. */
function watchPage(activePage: CdpPage): void {
  activePage.on('Page.frameNavigated', (params) => {
    const frame = params.frame as { id?: string; url?: string; parentId?: string } | undefined;
    if (!frame || frame.parentId) return;
    mainFrameId = frame.id ?? '';
    currentUrl = frame.url ?? '';
    currentTitle = '';
    isLoading = false;
    notice = undefined;
    scheduleStateRefresh();
    scheduleFrame(0);
  });
  activePage.on('Page.navigatedWithinDocument', (params) => {
    if (typeof params.url === 'string' && params.url) currentUrl = params.url;
    scheduleStateRefresh();
    scheduleFrame(0);
  });
  activePage.on('Page.frameStartedLoading', (params) => {
    if (params.frameId !== mainFrameId) return;
    isLoading = true;
    pushState();
  });
  activePage.on('Page.frameStoppedLoading', (params) => {
    if (params.frameId !== mainFrameId) return;
    isLoading = false;
    scheduleStateRefresh();
  });
  activePage.on('Page.loadEventFired', () => {
    isLoading = false;
    scheduleStateRefresh();
    scheduleFrame(0);
  });
  activePage.on('Page.titleChanged', (params) => {
    if (typeof params.title === 'string') currentTitle = params.title;
    pushState();
  });
}

/** Schedules one frame after input stops. A later event replaces the pending frame. */
function scheduleFrame(delayMs = FRAME_PAUSE_MS): void {
  frameGeneration++;
  if (frameTimer) clearTimeout(frameTimer);
  frameTimer = setTimeout(() => {
    frameTimer = null;
    void pumpFrame(frameGeneration);
  }, delayMs);
}

/** Pushes one page frame to the renderer. A stale frame is dropped if input arrived meanwhile. */
async function pumpFrame(generation: number): Promise<void> {
  if (!page || !hasPage || !bounds.visible || viewport.width < 1 || viewport.height < 1) return;
  if (frameInFlight) {
    scheduleFrame(FRAME_PAUSE_MS);
    return;
  }
  frameInFlight = true;
  try {
    // A screenshot sent during a navigation or resize can get no CDP reply. Without a timeout
    // frameInFlight stays true and the app never shows the page again.
    const data = await page.screenshot('jpeg', JPEG_QUALITY, FRAME_TIMEOUT_MS);
    if (generation !== frameGeneration) return;
    const frame: BrowserFrame = {
      data,
      width: viewport.width,
      height: viewport.height,
      sequence: ++frameSequence,
    };
    sendToApp(IPC_CHANNELS.browserFrame, frame);
  } catch {
    // Chrome may be busy or closing. The next input or navigation asks for a new frame.
  } finally {
    frameInFlight = false;
  }
}

function applyViewport(): void {
  if (!page || viewport.width < 1 || viewport.height < 1) return;
  const zoom = ownerWindow?.webContents.getZoomFactor() ?? 1;
  const width = Math.max(1, Math.round(viewport.width * zoom));
  const height = Math.max(1, Math.round(viewport.height * zoom));
  viewport = { width, height };
  void page
    .setViewport(width, height)
    .then(() => scheduleFrame())
    .catch(() => undefined);
}

/** Starts Chrome once, then attaches one page. Later navigations reuse the same page. */
async function ensurePage(): Promise<boolean> {
  if (page) return true;
  if (starting) return starting;
  starting = (async () => {
    try {
      chrome = await launchChrome({ userDataPath: app.getPath('userData') });
      // The window can close while Chrome is still starting; do not leave an orphaned process.
      if (disposed) {
        stopChrome();
        return false;
      }
      const connection = new CdpClient(chrome.endpoint.webSocketDebuggerUrl);
      await connection.connect();
      client = connection;
      await client.send('Browser.setDownloadBehavior', { behavior: 'deny' });
      await client.send('Target.setDiscoverTargets', { discover: true });
      page = await createCdpPage(client);
      await page.enableDomains();
      watchPage(page);
      // One page at a time: a popup is closed and its address opened in the active page.
      client.on('Target.targetCreated', (params) => {
        const target = params.targetInfo as { targetId?: string; type?: string; url?: string };
        if (target.type !== 'page' || !target.url || target.targetId === page?.targetId) return;
        // Check the address first so the app's own about:blank target is never closed.
        if (!isAllowedPageUrl(target.url)) return;
        void connection
          .send('Target.closeTarget', { targetId: target.targetId })
          .catch(() => undefined);
        void navigate(target.url);
      });
      if (viewport.width > 0 && viewport.height > 0) applyViewport();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setNotice('error', message);
      stopChrome();
      return false;
    } finally {
      starting = null;
    }
  })();
  return starting;
}

function stopChrome(): void {
  if (frameTimer) clearTimeout(frameTimer);
  frameTimer = null;
  frameInFlight = false;
  frameGeneration++;
  if (stateRefreshTimer) clearTimeout(stateRefreshTimer);
  stateRefreshTimer = null;
  lastStateJson = '';
  page?.detach();
  page = null;
  client?.close();
  client = null;
  chrome?.stop();
  chrome = null;
  hasPage = false;
  currentUrl = '';
  currentTitle = '';
  isLoading = false;
  canGoBack = false;
  canGoForward = false;
}

/** Ties the browser to the app window. Chrome starts on the first navigation. */
export function attachBrowser(window: BrowserWindow): void {
  ownerWindow = window;
  window.on('closed', () => {
    disposed = true;
    stopChrome();
    ownerWindow = null;
  });
}

export async function navigate(input: unknown): Promise<NavigateResponse> {
  if (typeof input !== 'string' || input.length > MAX_ADDRESS_LENGTH) {
    return { ok: false, error: 'The address is not valid.' };
  }
  const address = parseAddress(input);
  if (!address.ok) return address;
  if (!isAllowedPageUrl(address.url)) {
    return { ok: false, error: `Only http and https pages can be opened.` };
  }
  if (!(await ensurePage()) || !page) {
    return { ok: false, error: notice?.text ?? 'The browser could not start.' };
  }

  clearNotice();
  hasPage = true;
  isLoading = true;
  await page.navigate(address.url).catch(() => undefined);
  pushState();
  return { ok: true, url: address.url };
}

export async function runCommand(command: unknown): Promise<void> {
  if (!page || !hasPage) return;
  if (command === 'back') {
    await page.goBack().catch(() => undefined);
  } else if (command === 'forward') {
    await page.goForward().catch(() => undefined);
  } else if (command === 'reload') {
    await page.reload().catch(() => undefined);
  } else if (command === 'stop') {
    await page.stopLoading().catch(() => undefined);
  }
  await refreshHistory();
  pushState();
}

export function setBounds(next: unknown): void {
  if (typeof next !== 'object' || next === null) return;
  const { x, y, width, height, visible } = next as Partial<BrowserBounds>;
  const numbers = [x, y, width, height];
  if (!numbers.every((n) => typeof n === 'number' && Number.isFinite(n))) return;
  const previous = viewport;
  bounds = {
    x: x as number,
    y: y as number,
    width: width as number,
    height: height as number,
    visible: visible === true,
  };
  viewport = {
    width: Math.max(0, Math.round(bounds.width)),
    height: Math.max(0, Math.round(bounds.height)),
  };
  if (viewport.width !== previous.width || viewport.height !== previous.height) applyViewport();
  if (bounds.visible) scheduleFrame();
}

export function getState(): BrowserState {
  return currentState();
}

export async function capture(): Promise<CaptureResponse> {
  if (!page || !hasPage) return { ok: false, error: 'Open a page first.' };
  if (isLoading) return { ok: false, error: 'Wait for the page to finish loading.' };

  try {
    const data = await page.screenshot('png');
    const bytes = Buffer.from(data, 'base64');
    const png = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (png.byteLength > MAX_SCREENSHOT_BYTES) {
      return { ok: false, error: 'The capture is larger than 20 MB.' };
    }
    return {
      ok: true,
      bytes: png,
      source: {
        url: currentUrl,
        title: currentTitle,
        capturedAt: new Date().toISOString(),
      },
    };
  } catch {
    return { ok: false, error: 'The page could not be captured. Try again.' };
  }
}

export async function extractPage(): Promise<PageExtractResponse> {
  if (!page || !hasPage) return { ok: false, error: 'Open a page first.' };
  if (isLoading) return { ok: false, error: 'Wait for the page to finish loading.' };
  return readCdpPage(page, currentUrl);
}

export async function input(input: unknown): Promise<void> {
  if (!page || !hasPage) return;
  const event = input as BrowserInput;
  await dispatchInput(page, event);
  // One screenshot after the user stops typing, scrolling or moving the mouse keeps input fast.
  scheduleFrame();
}
