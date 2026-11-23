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
  BrowserState,
  CaptureResponse,
} from '../../../../shared/ipc-contract';
import { useScreenshots } from '../screenshots/ScreenshotsProvider';

export type CaptureStatus =
  | { kind: 'idle' }
  | { kind: 'capturing' }
  | { kind: 'captured'; fileName: string }
  | { kind: 'failed'; error: string };

const NO_PAGE: BrowserState = {
  hasPage: false,
  url: '',
  title: '',
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  security: 'not-secure',
};

interface BrowserContextValue {
  /** False outside Electron, where there is no browser view. */
  available: boolean;
  state: BrowserState;
  capture: CaptureStatus;
  /** Opens address bar text; resolves to an error message, or null when the page starts loading. */
  navigate: (input: string) => Promise<string | null>;
  command: (command: BrowserCommand) => void;
  captureScreenshot: () => Promise<void>;
}

const BrowserContext = createContext<BrowserContextValue | null>(null);

/**
 * Mirrors the browser state that main pushes, and turns page captures into screenshots. Sits
 * inside ScreenshotsProvider and above the workspaces, so the status bar can show it too.
 */
export function BrowserProvider({ children }: { children: ReactNode }) {
  const { addCapture } = useScreenshots();
  const [state, setState] = useState<BrowserState>(NO_PAGE);
  const [capture, setCapture] = useState<CaptureStatus>({ kind: 'idle' });
  const available = window.bridge !== undefined;

  useEffect(() => {
    const api = window.bridge;
    if (!api) return;
    let active = true;
    void api.browserGetState().then((initial) => {
      if (active) setState(initial);
    });
    const unsubscribe = api.onBrowserState(setState);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // "Added ..." stays visible for a few seconds, then the capture state goes back to idle.
  useEffect(() => {
    if (capture.kind !== 'captured') return;
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

  const value = useMemo(
    () => ({ available, state, capture, navigate, command, captureScreenshot }),
    [available, state, capture, navigate, command, captureScreenshot],
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
  if (capture.kind === 'failed') return `Capture failed: ${capture.error}`;
  return 'Idle';
}
