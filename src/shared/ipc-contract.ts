// IPC contract shared by the main process, the preload script and the renderer.
// The renderer imports types only; it never gets Electron or Node objects.

import type { PageSecurity } from './address';
import type { NetworkState } from './network';
import type { PageExtract } from './page-content';

export const IPC_CHANNELS = {
  getAppInfo: 'app:get-info',
  recognizeText: 'ocr:recognize',
  saveContextPackage: 'context:save',
  browserNavigate: 'browser:navigate',
  browserCommand: 'browser:command',
  browserNewTab: 'browser:new-tab',
  browserCloseTab: 'browser:close-tab',
  browserSelectTab: 'browser:select-tab',
  browserSetBounds: 'browser:set-bounds',
  browserGetState: 'browser:get-state',
  browserCapture: 'browser:capture',
  browserExtract: 'browser:extract',
  networkStart: 'network:start',
  networkStop: 'network:stop',
  networkClear: 'network:clear',
  networkRemove: 'network:remove',
  networkGetState: 'network:get-state',
  /** Main -> renderer event, sent while recording and after every change. */
  networkState: 'network:state',
  /** Main -> renderer event, sent whenever the browser page changes. */
  browserState: 'browser:state',
  /** Main -> renderer event when a page asks for HTTP credentials. */
  browserLoginRequest: 'browser:login-request',
  /** Main -> renderer event when a credential form must close. */
  browserLoginClosed: 'browser:login-closed',
  /** Renderer -> main answer to an HTTP credential request. */
  browserLoginResponse: 'browser:login-response',
} as const;

export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  chrome: string;
  /** True when the window uses the Mica material, so the sidebar can be translucent. */
  mica: boolean;
}

export type OcrEngineId = 'windows' | 'tesseract';

export const OCR_ENGINE_LABELS: Record<OcrEngineId, string> = {
  windows: 'Windows OCR',
  tesseract: 'Tesseract',
};

export interface OcrRequest {
  /** The original image file bytes. Main checks the size and file signature again. */
  bytes: Uint8Array;
}

export interface OcrResult {
  engine: OcrEngineId;
  /** Recognized text, one line per text line, trimmed. Empty when no text was found. */
  text: string;
  lineCount: number;
  durationMs: number;
  /** Mean word confidence from 0 to 100. Tesseract only; Windows OCR gives none. */
  confidence?: number;
  /** Why the earlier engine failed, when a fallback engine produced this result. */
  fallbackReason?: string;
}

export type OcrResponse = { ok: true; result: OcrResult } | { ok: false; error: string };

export interface SaveContextRequest {
  markdown: string;
  /** File name only; main sanitizes it and puts it in the Documents folder by default. */
  suggestedName: string;
}

export type SaveContextResponse =
  | { saved: true; filePath: string }
  | { saved: false; error?: string };

/** One tab in the tab strip. An empty tab has a blank URL and the title "New tab". */
export interface BrowserTabState {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
}

/** The browser state pushed by main whenever a tab or the active page changes. */
export interface BrowserState {
  activeTabId: string | null;
  tabs: BrowserTabState[];
  /** False while the active tab is empty; the browser view stays hidden until then. */
  hasPage: boolean;
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  security: PageSecurity;
  /** The latest notice: a failed load, a blocked link, a blocked download or permission. */
  notice?: { kind: 'error' | 'info'; text: string };
  /** True while an HTTP credential prompt is open for the active tab. */
  authRequired: boolean;
}

/** Metadata for a credential prompt. Main never sends stored credentials to the renderer. */
export interface BrowserLoginRequest {
  requestId: string;
  tabId: string;
  url: string;
  origin: string;
  host: string;
  realm?: string;
  isProxy: boolean;
}

export interface BrowserLoginResponse {
  requestId: string;
  accept: boolean;
  username?: string;
  password?: string;
}

export type BrowserCommand = 'back' | 'forward' | 'reload' | 'stop';

/** Where the renderer wants the browser view, in CSS pixels of the app window. */
export interface BrowserBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export type NavigateResponse = { ok: true; url: string } | { ok: false; error: string };

/** Where a browser capture came from; kept with the screenshot for the context package. */
export interface ScreenshotSource {
  url: string;
  title: string;
  /** ISO 8601 time of the capture. */
  capturedAt: string;
}

export type PageExtractResponse = { ok: true; page: PageExtract } | { ok: false; error: string };

export type CaptureResponse =
  | { ok: true; bytes: Uint8Array; source: ScreenshotSource }
  | { ok: false; error: string };

/** The API the preload script exposes to the renderer as `window.bridge`. */
export interface BridgeApi {
  getAppInfo(): Promise<AppInfo>;
  recognizeText(request: OcrRequest): Promise<OcrResponse>;
  saveContextPackage(request: SaveContextRequest): Promise<SaveContextResponse>;
  /** Opens address bar text: a URL, a bare host, or a DuckDuckGo search. */
  browserNavigate(input: string): Promise<NavigateResponse>;
  browserCommand(command: BrowserCommand): Promise<void>;
  /** Opens an empty tab and makes it active. */
  browserNewTab(): Promise<void>;
  /** Closes the given tab, or the active tab when no id is supplied. */
  browserCloseTab(id?: string): Promise<void>;
  /** Makes an existing tab active. */
  browserSelectTab(id: string): Promise<void>;
  browserSetBounds(bounds: BrowserBounds): void;
  browserGetState(): Promise<BrowserState>;
  /** PNG of the visible part of the active page. */
  browserCapture(): Promise<CaptureResponse>;
  /** Text, headings, tables, and selection of the active page; limited and redacted in main. */
  browserExtract(): Promise<PageExtractResponse>;
  /** Subscribes to browser state changes; returns a function that unsubscribes. */
  onBrowserState(listener: (state: BrowserState) => void): () => void;
  /** Answers an HTTP credential prompt; `accept: false` cancels authentication. */
  browserLoginResponse(response: BrowserLoginResponse): void;
  /** Subscribes to HTTP credential prompts; returns a function that unsubscribes. */
  onLoginRequest(listener: (request: BrowserLoginRequest) => void): () => void;
  /** Subscribes to credential form closing; returns a function that unsubscribes. */
  onLoginClosed(listener: (requestId: string) => void): () => void;
  /** Starts recording the active page's API responses. */
  networkStart(): Promise<{ ok: true } | { ok: false; error: string }>;
  networkStop(): Promise<void>;
  /** Removes every kept response. */
  networkClear(): Promise<void>;
  networkRemove(id: string): Promise<void>;
  networkGetState(): Promise<NetworkState>;
  onNetworkState(listener: (state: NetworkState) => void): () => void;
}
