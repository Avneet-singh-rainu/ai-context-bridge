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
  type BrowserLoginRequest,
  type BrowserState,
  type CaptureResponse,
  IPC_CHANNELS,
  type NavigateResponse,
  type PageExtractResponse,
} from '../../shared/ipc-contract';
import { bindBrowserRuntime } from './browser-runtime';
import { stopRecording } from './network-capture';
import { readPage } from './page-extract';
import { activeAfterClose, insertAfterActive } from './tab-model';

/** Cookies and storage for web pages, kept apart from the app UI's own session. */
const PARTITION = 'persist:browser';
const MAX_ADDRESS_LENGTH = 4096;
const NOTIFIED_PERMISSIONS = new Set(['media', 'geolocation', 'notifications', 'openExternal']);

interface TabRecord {
  id: string;
  /** Created on first navigation; an empty tab has no native view yet. */
  view: WebContentsView | null;
  hasPage: boolean;
  notice?: BrowserState['notice'];
}

interface LoginRequest {
  id: string;
  tabId: string;
  contents: WebContents;
  callback: (username?: string, password?: string) => void;
  details: BrowserLoginRequest;
  settled: boolean;
}

let ownerWindow: BrowserWindow | null = null;
let tabs: TabRecord[] = [];
let activeTabId: string | null = null;
let nextTabId = 1;
let bounds: BrowserBounds = { x: 0, y: 0, width: 0, height: 0, visible: false };
let lastState = '';
const hardenedSessions = new WeakSet<Session>();
const loginRequests: LoginRequest[] = [];
let activeLogin: LoginRequest | null = null;
let nextLoginId = 1;
let sendToRenderer: ((channel: string, payload: unknown) => void) | null = null;

function schemeOf(url: string): string {
  return url.split(':')[0] || 'that kind of';
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function loginDetails(
  requestId: string,
  tabId: string,
  url: string,
  authInfo: Electron.AuthInfo,
): BrowserLoginRequest {
  return {
    requestId,
    tabId,
    url,
    origin: originOf(url),
    host: authInfo.host || originOf(url),
    ...(authInfo.realm ? { realm: authInfo.realm } : {}),
    isProxy: authInfo.isProxy,
  };
}

function tabForLogin(request: LoginRequest): TabRecord | undefined {
  return tabs.find((tab) => tab.id === request.tabId);
}

function activeLoginForTab(tab: TabRecord | null): boolean {
  return activeLogin !== null && tab !== null && activeLogin.tabId === tab.id;
}

function settleLogin(request: LoginRequest, username?: string, password?: string): void {
  if (request.settled) return;
  request.settled = true;
  const index = loginRequests.indexOf(request);
  if (index >= 0) loginRequests.splice(index, 1);
  if (activeLogin === request) {
    sendToRenderer?.(IPC_CHANNELS.browserLoginClosed, request.id);
    activeLogin = null;
  }
  try {
    request.callback(username, password);
  } catch {
    // The page can disappear while the user is filling the form.
  }
  showNextLogin();
  applyBounds();
  pushState();
}

function cancelLoginsForTab(tabId: string): void {
  for (const request of [...loginRequests]) {
    if (request.tabId === tabId) settleLogin(request);
  }
}

function cancelLoginsForContents(contents: WebContents): void {
  for (const request of [...loginRequests]) {
    if (request.contents === contents) settleLogin(request);
  }
}

function cancelAllLogins(): void {
  for (const request of [...loginRequests]) settleLogin(request);
}

/** Shows the next prompt only for the active tab, so the credential form stays visible. */
function showNextLogin(): void {
  if (activeLogin || !sendToRenderer) return;
  const request = loginRequests.find((candidate) => {
    const tab = tabForLogin(candidate);
    return tab?.id === activeTabId && !candidate.contents.isDestroyed();
  });
  if (!request) return;
  activeLogin = request;
  sendToRenderer(IPC_CHANNELS.browserLoginRequest, request.details);
  applyBounds();
  pushState();
}

function activeTab(): TabRecord | null {
  return tabs.find((tab) => tab.id === activeTabId) ?? null;
}

function tabForContents(contents: WebContents): TabRecord | undefined {
  return tabs.find((tab) => tab.view?.webContents === contents);
}

function currentState(): BrowserState {
  const active = activeTab();
  const contents = active?.view?.webContents ?? null;
  const hasPage = active?.hasPage ?? false;
  const url = contents && hasPage ? contents.getURL() : '';

  return {
    activeTabId,
    tabs: tabs.map((tab) => {
      const tabContents = tab.view?.webContents;
      const tabUrl = tab.hasPage && tabContents ? tabContents.getURL() : '';
      return {
        id: tab.id,
        url: tabUrl,
        title:
          tab.hasPage && tabContents ? tabContents.getTitle() || tabUrl || 'New tab' : 'New tab',
        isLoading: tabContents?.isLoading() ?? false,
      };
    }),
    hasPage,
    url,
    title: contents && hasPage ? contents.getTitle() : '',
    isLoading: contents?.isLoading() ?? false,
    canGoBack: contents?.navigationHistory.canGoBack() ?? false,
    canGoForward: contents?.navigationHistory.canGoForward() ?? false,
    security: pageSecurity(url),
    authRequired: activeLoginForTab(active),
    ...(active?.notice ? { notice: active.notice } : {}),
  };
}

/** Sends a state only when a value changed, so page events do not flood the renderer. */
function pushState(): void {
  const state = currentState();
  const serialized = JSON.stringify(state);
  if (serialized === lastState) return;
  lastState = serialized;
  if (ownerWindow && !ownerWindow.isDestroyed()) {
    ownerWindow.webContents.send(IPC_CHANNELS.browserState, state);
  }
}

function setNotice(tab: TabRecord, kind: 'error' | 'info', text: string): void {
  tab.notice = { kind, text };
  pushState();
}

function setNoticeForContents(contents: WebContents, kind: 'error' | 'info', text: string): void {
  const tab = tabForContents(contents);
  if (tab) setNotice(tab, kind, text);
}

/** Applies the renderer's bounds to the active view and hides every other view. */
function applyBounds(): void {
  if (!ownerWindow) return;
  // The renderer measures in CSS pixels; scale by the app page's zoom to get window pixels.
  const zoom = ownerWindow.webContents.getZoomFactor();
  for (const tab of tabs) {
    const view = tab.view;
    if (!view || view.webContents.isDestroyed()) continue;
    const isActive = tab.id === activeTabId;
    if (!isActive) {
      view.setVisible(false);
      continue;
    }
    view.setBounds({
      x: Math.round(bounds.x * zoom),
      y: Math.round(bounds.y * zoom),
      width: Math.max(0, Math.round(bounds.width * zoom)),
      height: Math.max(0, Math.round(bounds.height * zoom)),
    });
    // A credential prompt hides the native view so the app form can draw in the same box.
    view.setVisible(bounds.visible && tab.hasPage && !activeLoginForTab(tab));
  }
}

/**
 * Session rules for web pages: no permissions, no downloads, and Electron's own user agent.
 * The `persist:browser` partition keeps cookies and other sign-in state across launches. Google
 * sign-in uses the page UI in the native view, so no OAuth client and no Chrome profile are needed.
 */
function hardenSession(browserSession: Session): void {
  if (hardenedSessions.has(browserSession)) return;
  hardenedSessions.add(browserSession);

  browserSession.setPermissionRequestHandler((contents, permission, callback) => {
    callback(false);
    if (NOTIFIED_PERMISSIONS.has(permission)) {
      const what = permission === 'openExternal' ? 'open another app' : `use ${permission}`;
      setNoticeForContents(
        contents,
        'info',
        `The page asked to ${what}. The app does not allow that.`,
      );
    }
  });
  browserSession.setPermissionCheckHandler(() => false);

  browserSession.on('will-download', (event, item, contents) => {
    event.preventDefault();
    setNoticeForContents(
      contents,
      'info',
      `Download blocked: ${item.getFilename()}. The built-in browser does not save files.`,
    );
  });
}

function watchPage(tab: TabRecord, contents: WebContents): void {
  // OAuth popups need their own webContents and the original opener. Returning a child view here
  // keeps window.opener and postMessage flows that sign-in providers use.
  contents.setWindowOpenHandler(({ url, disposition }) => {
    const blankPopup = url === '' || url === 'about:blank';
    if (!isAllowedPageUrl(url) && !blankPopup) {
      setNotice(
        tab,
        'info',
        `Blocked a ${schemeOf(url)} link. Only http and https pages open here.`,
      );
      return { action: 'deny' };
    }
    return {
      action: 'allow',
      outlivesOpener: true,
      createWindow: () => {
        const popup = createTab();
        popup.hasPage = true;
        if (disposition !== 'background-tab') changeActive(popup.id);
        // Ignore BrowserWindow options: the popup is an embedded tab and keeps the app's page rules.
        const view = ensureView(popup);
        pushState();
        return view.webContents;
      },
    };
  });

  contents.on('login', (event, details, authInfo, callback) => {
    event.preventDefault();
    const requestId = `login-${nextLoginId++}`;
    const request: LoginRequest = {
      id: requestId,
      tabId: tab.id,
      contents,
      callback,
      details: loginDetails(requestId, tab.id, details.url, authInfo),
      settled: false,
    };
    loginRequests.push(request);
    showNextLogin();
  });

  contents.on('destroyed', () => cancelLoginsForContents(contents));

  const blockOtherSchemes = (event: Electron.Event<{ url: string }>) => {
    if (!isAllowedPageUrl(event.url)) {
      event.preventDefault();
      setNotice(
        tab,
        'info',
        `Blocked a ${schemeOf(event.url)} link. Only http and https pages open here.`,
      );
    }
  };
  contents.on('will-navigate', blockOtherSchemes);
  contents.on('will-redirect', blockOtherSchemes);

  contents.on('did-start-loading', () => {
    tab.notice = undefined;
    pushState();
  });
  contents.on('did-stop-loading', pushState);
  contents.on('did-navigate', pushState);
  contents.on('did-navigate-in-page', pushState);
  contents.on('page-title-updated', pushState);
  contents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
    // -3 (ERR_ABORTED) means the user or a new navigation stopped the load: not an error.
    if (isMainFrame && errorCode !== -3) {
      setNotice(
        tab,
        'error',
        `Could not open ${validatedUrl}: ${errorDescription} (${errorCode}).`,
      );
    }
  });
  contents.on('render-process-gone', () => {
    setNotice(tab, 'error', 'The page stopped working. Reload to try again.');
  });
}

function ensureView(tab: TabRecord): WebContentsView {
  if (tab.view) return tab.view;
  if (!ownerWindow) throw new Error('The browser has no window yet.');

  hardenSession(session.fromPartition(PARTITION));
  const view = new WebContentsView({
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
  tab.view = view;
  watchPage(tab, view.webContents);
  applyBounds();
  return view;
}

function createTab(): TabRecord {
  const tab: TabRecord = { id: `tab-${nextTabId++}`, view: null, hasPage: false };
  tabs.splice(insertAfterActive(tabs, activeTabId), 0, tab);
  return tab;
}

function changeActive(id: string | null): void {
  if (id === activeTabId) return;
  stopRecording({ kind: 'info', text: 'Recording stopped: the active tab changed.' });
  const previousTabId = activeTabId;
  activeTabId = id;
  if (activeLogin && activeLogin.tabId === previousTabId) settleLogin(activeLogin);
  showNextLogin();
  applyBounds();
  pushState();
}

function loadTab(tab: TabRecord, url: string): void {
  const view = ensureView(tab);
  tab.hasPage = true;
  tab.notice = undefined;
  applyBounds();
  // Load errors arrive through did-fail-load, so the promise result is not needed here.
  void view.webContents.loadURL(url).catch(() => undefined);
  pushState();
}

function openTab(url?: string): void {
  const tab = createTab();
  changeActive(tab.id);
  if (url) loadTab(tab, url);
}

/** The active page's web contents, once a page is open; used by network capture. */
export function getPageContents(): WebContents | null {
  const tab = activeTab();
  if (!tab?.view || !tab.hasPage || tab.view.webContents.isDestroyed()) return null;
  return tab.view.webContents;
}

/** Ties the browser to the app window. Native views are created on first navigation. */
export function attachBrowser(window: BrowserWindow): void {
  ownerWindow = window;
  sendToRenderer = (channel, payload) => {
    if (ownerWindow && !ownerWindow.isDestroyed()) ownerWindow.webContents.send(channel, payload);
  };
  bindBrowserRuntime(() => getPageContents(), sendToRenderer);
  window.on('closed', () => {
    cancelAllLogins();
    for (const tab of tabs) {
      if (tab.view && !tab.view.webContents.isDestroyed()) tab.view.webContents.close();
    }
    tabs = [];
    activeTabId = null;
    bounds = { x: 0, y: 0, width: 0, height: 0, visible: false };
    lastState = '';
    ownerWindow = null;
    sendToRenderer = null;
  });
}

export function navigate(input: unknown): NavigateResponse {
  if (typeof input !== 'string' || input.length > MAX_ADDRESS_LENGTH) {
    return { ok: false, error: 'The address is not valid.' };
  }
  const address = parseAddress(input);
  if (!address.ok) return address;

  const tab = activeTab() ?? createTab();
  changeActive(tab.id);
  loadTab(tab, address.url);
  return { ok: true, url: address.url };
}

export function newTab(): void {
  openTab();
}

export function closeTab(input?: unknown): void {
  if (input !== undefined && typeof input !== 'string') return;
  const id = input ?? activeTabId;
  if (!id) return;
  const tab = tabs.find((item) => item.id === id);
  if (!tab) return;

  const nextActive = activeAfterClose(tabs, id, activeTabId);
  if (id === activeTabId) {
    stopRecording({ kind: 'info', text: 'Recording stopped: the active tab was closed.' });
  }
  cancelLoginsForTab(id);
  if (tab.view) {
    if (ownerWindow && !ownerWindow.isDestroyed())
      ownerWindow.contentView.removeChildView(tab.view);
    if (!tab.view.webContents.isDestroyed()) tab.view.webContents.close();
  }
  tabs = tabs.filter((item) => item.id !== id);
  changeActive(nextActive);
  pushState();
}

export function selectTab(input: unknown): void {
  if (typeof input !== 'string') return;
  if (!tabs.some((tab) => tab.id === input)) return;
  changeActive(input);
}

/** Answers the credential form; only the active prompt can be answered. */
export function respondToLogin(input: unknown): void {
  if (typeof input !== 'object' || input === null) return;
  const answer = input as {
    requestId?: unknown;
    accept?: unknown;
    username?: unknown;
    password?: unknown;
  };
  if (typeof answer.requestId !== 'string' || activeLogin?.id !== answer.requestId) return;
  const request = activeLogin;
  if (answer.accept !== true) {
    settleLogin(request);
    return;
  }
  const username = typeof answer.username === 'string' ? answer.username : '';
  const password = typeof answer.password === 'string' ? answer.password : '';
  settleLogin(request, username, password);
}

export function runCommand(command: unknown): void {
  const tab = activeTab();
  const contents = tab?.view?.webContents;
  if (!contents) return;
  const history = contents.navigationHistory;
  if (command === 'back' && history.canGoBack()) history.goBack();
  else if (command === 'forward' && history.canGoForward()) history.goForward();
  else if (command === 'reload' && tab?.hasPage) contents.reload();
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

/** Text, headings, tables, and selection of the active page. */
export async function extractPage(): Promise<PageExtractResponse> {
  const contents = getPageContents();
  if (!contents) return { ok: false, error: 'Open a page first.' };
  return readPage(contents);
}

export async function capture(): Promise<CaptureResponse> {
  const contents = getPageContents();
  if (!contents) return { ok: false, error: 'Open a page first.' };
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
