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
import { type ImportResult, importScreenshots, type Screenshot } from './import-screenshots';
import { type ScreenshotListAction, screenshotListReducer } from './screenshot-list';

interface ScreenshotsContextValue {
  screenshots: readonly Screenshot[];
  importing: boolean;
  lastImport: ImportResult | null;
  addFiles: (files: readonly File[]) => Promise<void>;
  remove: (id: string) => void;
  move: (id: string, toIndex: number) => void;
}

const ScreenshotsContext = createContext<ScreenshotsContextValue | null>(null);

function reducer(list: readonly Screenshot[], action: ScreenshotListAction<Screenshot>) {
  return screenshotListReducer(list, action);
}

/**
 * Holds the imported screenshots above the workspaces, so the list survives switching views.
 * App.tsx unmounts the inactive workspace.
 */
export function ScreenshotsProvider({ children }: { children: ReactNode }) {
  const [screenshots, dispatch] = useReducer(reducer, []);
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);

  // The latest list for duplicate and limit checks, without re-creating addFiles each render.
  const screenshotsRef = useRef(screenshots);
  screenshotsRef.current = screenshots;
  const importingRef = useRef(false);

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

  const remove = useCallback((id: string) => dispatch({ type: 'remove', id }), []);
  const move = useCallback(
    (id: string, toIndex: number) => dispatch({ type: 'move', id, toIndex }),
    [],
  );

  const value = useMemo(
    () => ({ screenshots, importing, lastImport, addFiles, remove, move }),
    [screenshots, importing, lastImport, addFiles, remove, move],
  );

  return <ScreenshotsContext.Provider value={value}>{children}</ScreenshotsContext.Provider>;
}

export function useScreenshots(): ScreenshotsContextValue {
  const value = useContext(ScreenshotsContext);
  if (!value) throw new Error('useScreenshots must be used inside ScreenshotsProvider');
  return value;
}
