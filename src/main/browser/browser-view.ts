import {
  type BrowserWindow,
  type Session,
  session,
  type WebContents,
  WebContentsView,
} from 'electron';
import { isAllowedPageUrl, pageSecurity, parseAddress } from '../../shared/address';
import { MAX_SCREENSHOT_BYTES } from '../../shared/image-format';
import {
  type BrowserBounds,
  type BrowserState,
  type CaptureResponse,
  IPC_CHANNELS,
  type NavigateResponse,
  type PageExtractResponse,
} from '../../shared/ipc-contract';
import { readPage } from './page-extract';
import { plainChromeUserAgent } from './user-agent';

/** Cookies and storage for web pages, kept apart from the app UI's own session. */
const PARTITION = 'persist:browser';
const MAX_ADDRESS_LENGTH = 4096;
const NOTIFIED_PERMISSIONS = new Set(['media', 'geolocation', 'notifications', 'openExternal']);

let ownerWindow: BrowserWindow | null = null;
let view: WebContentsView | null = null;
let hasPage = false;
let notice: BrowserState['notice'];
let bounds: BrowserBounds = { x: 0, y: 0, width: 0, height: 0, visible: false };
const hardenedSessions = new WeakSet<Session>();

function schemeOf(url: string): string {
  return url.split(':')[0] || 'that kind of';
}

function currentState(): BrowserState {
  const contents = view?.webContents;
  const url = contents && hasPage ? contents.getURL() : '';
  return {
    hasPage,
    url,
    title: contents && hasPage ? contents.getTitle() : '',
    isLoading: contents?.isLoading() ?? false,
    canGoBack: contents?.navigationHistory.canGoBack() ?? false,
    canGoForward: contents?.navigationHistory.canGoForward() ?? false,
    security: pageSecurity(url),
    ...(notice ? { notice } : {}),
  };
}

function pushState(): void {
  if (ownerWindow && !ownerWindow.isDestroyed()) {
    ownerWindow.webContents.send(IPC_CHANNELS.browserState, currentState());
  }
}

function setNotice(kind: 'error' | 'info', text: string): void {
  notice = { kind, text };
  pushState();
}

/** Applies the renderer's bounds. The view stays hidden until the first page is opened. */
function applyBounds(): void {
  if (!view || !ownerWindow) return;
  // The renderer measures in CSS pixels; scale by the app page's zoom to get window pixels.
  const zoom = ownerWindow.webContents.getZoomFactor();
  view.setBounds({
    x: Math.round(bounds.x * zoom),
    y: Math.round(bounds.y * zoom),
    width: Math.max(0, Math.round(bounds.width * zoom)),
    height: Math.max(0, Math.round(bounds.height * zoom)),
  });
  view.setVisible(bounds.visible && hasPage);
}

/** Session rules for web pages: no permissions, no downloads, and a plain Chrome user agent. */
function hardenSession(browserSession: Session): void {
  if (hardenedSessions.has(browserSession)) return;
  hardenedSessions.add(browserSession);

  browserSession.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(false);
    if (NOTIFIED_PERMISSIONS.has(permission)) {
      const what = permission === 'openExternal' ? 'open another app' : `use ${permission}`;
      setNotice('info', `The page asked to ${what}. The app does not allow that.`);
    }
  });
  browserSession.setPermissionCheckHandler(() => false);

  browserSession.on('will-download', (event, item) => {
    event.preventDefault();
    setNotice(
      'info',
      `Download blocked: ${item.getFilename()}. The built-in browser does not save files.`,
    );
  });

  browserSession.setUserAgent(plainChromeUserAgent(browserSession.getUserAgent()));
}

function watchPage(contents: WebContents): void {
  // One page at a time: popups and target="_blank" links open in this same view.
  contents.setWindowOpenHandler(({ url }) => {
    if (isAllowedPageUrl(url)) void contents.loadURL(url).catch(() => undefined);
    else setNotice('info', `Blocked a ${schemeOf(url)} link. Only http and https pages open here.`);
    return { action: 'deny' };
  });

  const blockOtherSchemes = (event: Electron.Event<{ url: string }>) => {
    if (!isAllowedPageUrl(event.url)) {
      event.preventDefault();
      setNotice(
        'info',
        `Blocked a ${schemeOf(event.url)} link. Only http and https pages open here.`,
      );
    }
  };
  contents.on('will-navigate', blockOtherSchemes);
  contents.on('will-redirect', blockOtherSchemes);

  contents.on('did-start-loading', () => {
    notice = undefined;
    pushState();
  });
  contents.on('did-stop-loading', pushState);
  contents.on('did-navigate', pushState);
  contents.on('did-navigate-in-page', pushState);
  contents.on('page-title-updated', pushState);
  contents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
    // -3 (ERR_ABORTED) means the user or a new navigation stopped the load: not an error.
    if (isMainFrame && errorCode !== -3) {
      setNotice('error', `Could not open ${validatedUrl}: ${errorDescription} (${errorCode}).`);
    }
  });
  contents.on('render-process-gone', () => {
    setNotice('error', 'The page stopped working. Reload to try again.');
  });
}

function ensureView(): WebContentsView {
  if (view) return view;
  if (!ownerWindow) throw new Error('The browser has no window yet.');

  hardenSession(session.fromPartition(PARTITION));
  view = new WebContentsView({
    webPreferences: {
      partition: PARTITION,
      // Web pages get no preload, no Node, and no bridge to the app.
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
    },
  });
  view.setBackgroundColor('#ffffff');
  view.setVisible(false);
  ownerWindow.contentView.addChildView(view);
  watchPage(view.webContents);
  applyBounds();
  return view;
}

/** The active page's web contents, once a page is open; used by network capture. */
export function getPageContents(): WebContents | null {
  return view && hasPage ? view.webContents : null;
}

/** Sends an event to the app UI, if its window is still open. */
export function sendToApp(channel: string, payload: unknown): void {
  if (ownerWindow && !ownerWindow.isDestroyed()) ownerWindow.webContents.send(channel, payload);
}

/** Ties the browser to the app window. The page view itself is created on first navigation. */
export function attachBrowser(window: BrowserWindow): void {
  ownerWindow = window;
  window.on('closed', () => {
    view?.webContents.close();
    view = null;
    ownerWindow = null;
    hasPage = false;
  });
}

export function navigate(input: unknown): NavigateResponse {
  if (typeof input !== 'string' || input.length > MAX_ADDRESS_LENGTH) {
    return { ok: false, error: 'The address is not valid.' };
  }
  const address = parseAddress(input);
  if (!address.ok) return address;

  const contents = ensureView().webContents;
  hasPage = true;
  notice = undefined;
  applyBounds();
  // Load errors arrive through did-fail-load, so the promise result is not needed here.
  void contents.loadURL(address.url).catch(() => undefined);
  pushState();
  return { ok: true, url: address.url };
}

export function runCommand(command: unknown): void {
  const contents = view?.webContents;
  if (!contents) return;
  const history = contents.navigationHistory;
  if (command === 'back' && history.canGoBack()) history.goBack();
  else if (command === 'forward' && history.canGoForward()) history.goForward();
  else if (command === 'reload' && hasPage) contents.reload();
  else if (command === 'stop') contents.stop();
}

export function setBounds(next: unknown): void {
  if (typeof next !== 'object' || next === null) return;
  const { x, y, width, height, visible } = next as Partial<BrowserBounds>;
  const numbers = [x, y, width, height];
  if (!numbers.every((n) => typeof n === 'number' && Number.isFinite(n))) return;
  bounds = {
    x: x as number,
    y: y as number,
    width: width as number,
    height: height as number,
    visible: visible === true,
  };
  applyBounds();
}

export function getState(): BrowserState {
  return currentState();
}

/**
 * Right after a load, Chromium may have no frame to copy yet and capturePage rejects with
 * "UnknownVizError". Ask for a repaint and try again, up to three times.
 */
async function grabFrame(contents: WebContents): Promise<Electron.NativeImage | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const image = await contents.capturePage();
      if (!image.isEmpty()) return image;
    } catch {
      // No frame yet; repaint below and retry.
    }
    contents.invalidate();
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}

/** PNG of the visible part of the active page. */
/** Text, headings, tables, and selection of the active page. */
export async function extractPage(): Promise<PageExtractResponse> {
  const contents = view?.webContents;
  if (!contents || !hasPage) return { ok: false, error: 'Open a page first.' };
  return readPage(contents);
}

export async function capture(): Promise<CaptureResponse> {
  const contents = view?.webContents;
  if (!contents || !hasPage) return { ok: false, error: 'Open a page first.' };
  if (contents.isLoading()) return { ok: false, error: 'Wait for the page to finish loading.' };

  const image = await grabFrame(contents);
  if (!image) return { ok: false, error: 'The page could not be captured. Try again.' };
  const png = image.toPNG();
  if (png.byteLength > MAX_SCREENSHOT_BYTES) {
    return { ok: false, error: 'The capture is larger than 20 MB.' };
  }
  return {
    ok: true,
    bytes: new Uint8Array(png.buffer, png.byteOffset, png.byteLength),
    source: {
      url: contents.getURL(),
      title: contents.getTitle(),
      capturedAt: new Date().toISOString(),
    },
  };
}
