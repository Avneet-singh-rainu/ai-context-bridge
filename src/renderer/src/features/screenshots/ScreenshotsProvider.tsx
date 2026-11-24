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
import type { OcrResponse, ScreenshotSource } from '../../../../shared/ipc-contract';
import { type ImportResult, importScreenshots, type Screenshot } from './import-screenshots';
import { needsExtraction, type OcrState, ocrReducer } from './ocr-store';
import { type ScreenshotListAction, screenshotListReducer } from './screenshot-list';

interface ScreenshotsContextValue {
  screenshots: readonly Screenshot[];
  importing: boolean;
  lastImport: ImportResult | null;
  addFiles: (files: readonly File[]) => Promise<void>;
  /** Adds a browser capture; resolves to null when another import is still running. */
  addCapture: (file: File, source: ScreenshotSource) => Promise<ImportResult | null>;
  remove: (id: string) => void;
  move: (id: string, toIndex: number) => void;
  /** OCR results by screenshot id. */
  ocr: OcrState;
  extracting: boolean;
  /** False when the renderer runs outside Electron, where there is no OCR bridge. */
  canExtract: boolean;
  extractText: () => Promise<void>;
  /** Runs OCR for one screenshot, when that screenshot still needs text. */
  recognizeOne: (id: string) => Promise<void>;
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

  /** One import at a time; every file goes through the same checks, captures included. */
  const runImport = useCallback(
    async (files: readonly File[], source?: ScreenshotSource): Promise<ImportResult | null> => {
      if (importingRef.current || files.length === 0) return null;
      importingRef.current = true;
      setImporting(true);
      try {
        const result = await importScreenshots(files, screenshotsRef.current);
        const added = source ? result.added.map((shot) => ({ ...shot, source })) : result.added;
        dispatch({ type: 'add', items: added });
        const final = { ...result, added };
        setLastImport(final);
        return final;
      } finally {
        importingRef.current = false;
        setImporting(false);
      }
    },
    [],
  );

  const addFiles = useCallback(
    async (files: readonly File[]) => {
      await runImport(files);
    },
    [runImport],
  );

  const addCapture = useCallback(
    (file: File, source: ScreenshotSource) => runImport([file], source),
    [runImport],
  );

  const isListed = useCallback(
    (id: string) => screenshotsRef.current.some((shot) => shot.id === id),
    [],
  );

  const runOne = useCallback(
    async (screenshot: Screenshot) => {
      dispatchOcr({ type: 'start', id: screenshot.id });
      const response = await recognize(screenshot);
      // The user may remove a screenshot while its OCR runs; drop that result.
      if (!isListed(screenshot.id)) return;
      dispatchOcr(
        response.ok
          ? { type: 'succeed', id: screenshot.id, result: response.result }
          : {
              type: 'fail',
              id: screenshot.id,
              error: response.error.replace(/^Text extraction failed\.\s*/, ''),
            },
      );
    },
    [isListed],
  );

  /** Runs OCR on each screenshot without text, one at a time, in list order. */
  const extractText = useCallback(async () => {
    if (extractingRef.current) return;
    extractingRef.current = true;
    setExtracting(true);
    try {
      for (const screenshot of [...screenshotsRef.current]) {
        if (!isListed(screenshot.id) || !needsExtraction(ocrRef.current[screenshot.id])) continue;
        await runOne(screenshot);
      }
    } finally {
      extractingRef.current = false;
      setExtracting(false);
    }
  }, [isListed, runOne]);

  const recognizeOne = useCallback(
    async (id: string) => {
      if (extractingRef.current) return;
      const screenshot = screenshotsRef.current.find((shot) => shot.id === id);
      if (!screenshot || !needsExtraction(ocrRef.current[id])) return;
      extractingRef.current = true;
      setExtracting(true);
      try {
        await runOne(screenshot);
      } finally {
        extractingRef.current = false;
        setExtracting(false);
      }
    },
    [runOne],
  );

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
      addCapture,
      remove,
      move,
      ocr,
      extracting,
      canExtract,
      extractText,
      recognizeOne,
      editText,
      restoreText,
    }),
    [
      screenshots,
      importing,
      lastImport,
      addFiles,
      addCapture,
      remove,
      move,
      ocr,
      extracting,
      canExtract,
      extractText,
      recognizeOne,
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
