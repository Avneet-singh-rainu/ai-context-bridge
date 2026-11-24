import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { captureFileName } from '../../../../shared/address';
import type {
  BrowserCommand,
  BrowserLoginRequest,
  BrowserLoginResponse,
  BrowserState,
  CaptureResponse,
  PageExtractResponse,
} from '../../../../shared/ipc-contract';
import { usePageContent } from '../context/PageContentProvider';
import { useScreenshots } from '../screenshots/ScreenshotsProvider';

export type CaptureStatus =
  | { kind: 'idle' }
  | { kind: 'capturing' }
  | { kind: 'captured'; fileName: string }
  | { kind: 'extracting' }
  | { kind: 'extracted'; title: string; characters: number }
  | { kind: 'failed'; error: string };

const NO_PAGE: BrowserState = {
  activeTabId: null,
  tabs: [],
  hasPage: false,
  url: '',
  title: '',
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  security: 'not-secure',
  authRequired: false,
};

interface BrowserContextValue {
  /** False outside Electron, where there is no browser view. */
  available: boolean;
  state: BrowserState;
  capture: CaptureStatus;
  /** The open HTTP credential request, or null when no page is asking to sign in. */
  loginRequest: BrowserLoginRequest | null;
  /** Sends credentials to main; `accept: false` cancels the request. */
  submitLogin: (response: BrowserLoginResponse) => void;
  /** Opens address bar text; resolves to an error message, or null when the page starts loading. */
  navigate: (input: string) => Promise<string | null>;
  command: (command: BrowserCommand) => void;
  newTab: () => void;
  closeTab: (id: string) => void;
  selectTab: (id: string) => void;
  captureScreenshot: () => Promise<void>;
  /** Reads the page's text, headings, tables, and selection into Context. */
  extractPage: () => Promise<void>;
}

const BrowserContext = createContext<BrowserContextValue | null>(null);

/**
 * Mirrors the browser state that main pushes, and turns page captures into screenshots. Sits
 * inside ScreenshotsProvider and above the workspaces, so the status bar can show it too.
 */
export function BrowserProvider({ children }: { children: ReactNode }) {
  const { addCapture } = useScreenshots();
  const { addPage } = usePageContent();
  const [state, setState] = useState<BrowserState>(NO_PAGE);
  const [capture, setCapture] = useState<CaptureStatus>({ kind: 'idle' });
  const [loginRequest, setLoginRequest] = useState<BrowserLoginRequest | null>(null);
  const available = window.bridge !== undefined;

  useEffect(() => {
    const api = window.bridge;
    if (!api) return;
    let active = true;
    void api.browserGetState().then((initial) => {
      if (active) setState(initial);
    });
    const unsubscribe = api.onBrowserState(setState);
    const unsubscribeLogin = api.onLoginRequest((request) => {
      if (active) setLoginRequest(request);
    });
    const unsubscribeClosed = api.onLoginClosed((requestId) => {
      if (active) {
        setLoginRequest((current) => (current?.requestId === requestId ? null : current));
      }
    });
    return () => {
      active = false;
      unsubscribe();
      unsubscribeLogin();
      unsubscribeClosed();
    };
  }, []);

  // "Added ..." stays visible for a few seconds, then the capture state goes back to idle.
  useEffect(() => {
    if (capture.kind !== 'captured' && capture.kind !== 'extracted') return;
    const timer = setTimeout(() => setCapture({ kind: 'idle' }), 6000);
    return () => clearTimeout(timer);
  }, [capture]);

  const navigate = useCallback(async (input: string) => {
    const api = window.bridge;
    if (!api) return 'The built-in browser needs the desktop app.';
    const response = await api.browserNavigate(input);
    return response.ok ? null : response.error;
  }, []);

  const command = useCallback((name: BrowserCommand) => {
    void window.bridge?.browserCommand(name);
  }, []);

  const submitLogin = useCallback((response: BrowserLoginResponse) => {
    window.bridge?.browserLoginResponse(response);
    setLoginRequest(null);
  }, []);

  const newTab = useCallback(() => {
    setCapture({ kind: 'idle' });
    void window.bridge?.browserNewTab();
  }, []);

  const closeTab = useCallback((id: string) => {
    setCapture({ kind: 'idle' });
    void window.bridge?.browserCloseTab(id);
  }, []);

  const selectTab = useCallback((id: string) => {
    setCapture({ kind: 'idle' });
    void window.bridge?.browserSelectTab(id);
  }, []);

  const captureScreenshot = useCallback(async () => {
    const api = window.bridge;
    if (!api) return;
    setCapture({ kind: 'capturing' });
    // A rejected IPC call must not leave the state stuck on "capturing".
    const response = await api
      .browserCapture()
      .catch((): CaptureResponse => ({ ok: false, error: 'The page could not be captured.' }));
    if (!response.ok) {
      setCapture({ kind: 'failed', error: response.error });
      return;
    }
    const { source } = response;
    const fileName = captureFileName(source.url, new Date(source.capturedAt));
    const file = new File([new Uint8Array(response.bytes)], fileName, {
      type: 'image/png',
      lastModified: Date.parse(source.capturedAt),
    });
    const result = await addCapture(file, source);
    if (!result) {
      setCapture({ kind: 'failed', error: 'Another import is running. Try again in a moment.' });
    } else if (result.added.length === 0) {
      const reason = result.rejected[0]?.reason ?? 'The capture was not added.';
      setCapture({ kind: 'failed', error: reason });
    } else {
      setCapture({ kind: 'captured', fileName });
    }
  }, [addCapture]);

  const extractPage = useCallback(async () => {
    const api = window.bridge;
    if (!api) return;
    setCapture({ kind: 'extracting' });
    const response = await api
      .browserExtract()
      .catch((): PageExtractResponse => ({ ok: false, error: 'The page could not be read.' }));
    if (!response.ok) {
      setCapture({ kind: 'failed', error: response.error });
      return;
    }
    const error = addPage(response.page);
    if (error) {
      setCapture({ kind: 'failed', error });
      return;
    }
    setCapture({
      kind: 'extracted',
      title: response.page.title || response.page.url,
      characters: response.page.stats.characters,
    });
  }, [addPage]);

  const value = useMemo(
    () => ({
      available,
      state,
      capture,
      loginRequest,
      submitLogin,
      navigate,
      command,
      newTab,
      closeTab,
      selectTab,
      captureScreenshot,
      extractPage,
    }),
    [
      available,
      state,
      capture,
      loginRequest,
      submitLogin,
      navigate,
      command,
      newTab,
      closeTab,
      selectTab,
      captureScreenshot,
      extractPage,
    ],
  );

  return <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>;
}

export function useBrowser(): BrowserContextValue {
  const value = useContext(BrowserContext);
  if (!value) throw new Error('useBrowser must be used inside BrowserProvider');
  return value;
}

/** Short text for the capture state, shared by the Browser view and the status bar. */
export function describeCapture(capture: CaptureStatus): string {
  if (capture.kind === 'capturing') return 'Capturing the page...';
  if (capture.kind === 'captured') return `Added ${capture.fileName} to Screenshots`;
  if (capture.kind === 'extracting') return 'Reading the page...';
  if (capture.kind === 'extracted') {
    return `Added page text from "${capture.title}" to Context (${capture.characters} characters)`;
  }
  if (capture.kind === 'failed') return `Failed: ${capture.error}`;
  return 'Idle';
}
