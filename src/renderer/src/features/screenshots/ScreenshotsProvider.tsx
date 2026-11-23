import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { OcrResponse } from '../../../../shared/ipc-contract';
import { type ImportResult, importScreenshots, type Screenshot } from './import-screenshots';
import { needsExtraction, type OcrState, ocrReducer } from './ocr-store';
import { type ScreenshotListAction, screenshotListReducer } from './screenshot-list';

interface ScreenshotsContextValue {
  screenshots: readonly Screenshot[];
  importing: boolean;
  lastImport: ImportResult | null;
  addFiles: (files: readonly File[]) => Promise<void>;
  remove: (id: string) => void;
  move: (id: string, toIndex: number) => void;
  /** OCR results by screenshot id. */
  ocr: OcrState;
  extracting: boolean;
  /** False when the renderer runs outside Electron, where there is no OCR bridge. */
  canExtract: boolean;
  extractText: () => Promise<void>;
  editText: (id: string, text: string) => void;
  restoreText: (id: string) => void;
}

const ScreenshotsContext = createContext<ScreenshotsContextValue | null>(null);

function reducer(list: readonly Screenshot[], action: ScreenshotListAction<Screenshot>) {
  return screenshotListReducer(list, action);
}

async function recognize(screenshot: Screenshot): Promise<OcrResponse> {
  const bridge = window.bridge;
  if (!bridge) return { ok: false, error: 'Text extraction needs the desktop app.' };
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await screenshot.file.arrayBuffer());
  } catch {
    return {
      ok: false,
      error: 'The image file could not be read. It may have been moved or deleted.',
    };
  }
  try {
    return await bridge.recognizeText({ bytes });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Holds the imported screenshots and their OCR text above the workspaces, so both survive
 * switching views. App.tsx unmounts the inactive workspace.
 */
export function ScreenshotsProvider({ children }: { children: ReactNode }) {
  const [screenshots, dispatch] = useReducer(reducer, []);
  const [ocr, dispatchOcr] = useReducer(ocrReducer, {});
  const [importing, setImporting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);
  const canExtract = window.bridge !== undefined;

  // The latest state for async loops, without re-creating the callbacks each render.
  const screenshotsRef = useRef(screenshots);
  screenshotsRef.current = screenshots;
  const ocrRef = useRef(ocr);
  ocrRef.current = ocr;
  const importingRef = useRef(false);
  const extractingRef = useRef(false);

  const addFiles = useCallback(async (files: readonly File[]) => {
    if (importingRef.current || files.length === 0) return;
    importingRef.current = true;
    setImporting(true);
    try {
      const result = await importScreenshots(files, screenshotsRef.current);
      dispatch({ type: 'add', items: result.added });
      setLastImport(result);
    } finally {
      importingRef.current = false;
      setImporting(false);
    }
  }, []);

  /** Runs OCR on each screenshot without text, one at a time, in list order. */
  const extractText = useCallback(async () => {
    const isListed = (id: string) => screenshotsRef.current.some((shot) => shot.id === id);
    if (extractingRef.current) return;
    extractingRef.current = true;
    setExtracting(true);
    try {
      for (const screenshot of [...screenshotsRef.current]) {
        if (!isListed(screenshot.id) || !needsExtraction(ocrRef.current[screenshot.id])) continue;
        dispatchOcr({ type: 'start', id: screenshot.id });
        const response = await recognize(screenshot);
        // The user may remove a screenshot while its OCR runs; drop that result.
        if (!isListed(screenshot.id)) continue;
        dispatchOcr(
          response.ok
            ? { type: 'succeed', id: screenshot.id, result: response.result }
            : {
                type: 'fail',
                id: screenshot.id,
                error: response.error.replace(/^Text extraction failed\.\s*/, ''),
              },
        );
      }
    } finally {
      extractingRef.current = false;
      setExtracting(false);
    }
  }, []);

  const remove = useCallback((id: string) => {
    dispatch({ type: 'remove', id });
    dispatchOcr({ type: 'forget', id });
  }, []);
  const move = useCallback(
    (id: string, toIndex: number) => dispatch({ type: 'move', id, toIndex }),
    [],
  );
  const editText = useCallback(
    (id: string, text: string) => dispatchOcr({ type: 'edit', id, text }),
    [],
  );
  const restoreText = useCallback((id: string) => dispatchOcr({ type: 'restore', id }), []);

  const value = useMemo(
    () => ({
      screenshots,
      importing,
      lastImport,
      addFiles,
      remove,
      move,
      ocr,
      extracting,
      canExtract,
      extractText,
      editText,
      restoreText,
    }),
    [
      screenshots,
      importing,
      lastImport,
      addFiles,
      remove,
      move,
      ocr,
      extracting,
      canExtract,
      extractText,
      editText,
      restoreText,
    ],
  );

  return <ScreenshotsContext.Provider value={value}>{children}</ScreenshotsContext.Provider>;
}

export function useScreenshots(): ScreenshotsContextValue {
  const value = useContext(ScreenshotsContext);
  if (!value) throw new Error('useScreenshots must be used inside ScreenshotsProvider');
  return value;
}
