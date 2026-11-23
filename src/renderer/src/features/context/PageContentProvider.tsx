import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { PAGE_LIMITS, type PageExtract } from '../../../../shared/page-content';
import { type PageState, pageReducer } from './page-store';

interface PageContentContextValue {
  pages: PageState;
  /** Adds an extracted page; returns an error message when the page limit is reached. */
  addPage: (extract: PageExtract) => string | null;
  removePage: (id: string) => void;
  editPage: (id: string, field: 'markdown' | 'selection', text: string) => void;
  restorePage: (id: string) => void;
}

const PageContentContext = createContext<PageContentContextValue | null>(null);

let pageCounter = 0;

/** Holds extracted browser pages above the workspaces, so they survive switching views. */
export function PageContentProvider({ children }: { children: ReactNode }) {
  const [pages, dispatch] = useReducer(pageReducer, []);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const addPage = useCallback((extract: PageExtract) => {
    if (pagesRef.current.length >= PAGE_LIMITS.maxPages) {
      return `The limit of ${PAGE_LIMITS.maxPages} pages is reached. Remove one in Context first.`;
    }
    pageCounter += 1;
    dispatch({ type: 'add', id: `page-${pageCounter}`, extract });
    return null;
  }, []);
  const removePage = useCallback((id: string) => dispatch({ type: 'remove', id }), []);
  const editPage = useCallback(
    (id: string, field: 'markdown' | 'selection', text: string) =>
      dispatch({ type: 'edit', id, field, text }),
    [],
  );
  const restorePage = useCallback((id: string) => dispatch({ type: 'restore', id }), []);

  const value = useMemo(
    () => ({ pages, addPage, removePage, editPage, restorePage }),
    [pages, addPage, removePage, editPage, restorePage],
  );
  return <PageContentContext.Provider value={value}>{children}</PageContentContext.Provider>;
}

export function usePageContent(): PageContentContextValue {
  const value = useContext(PageContentContext);
  if (!value) throw new Error('usePageContent must be used inside PageContentProvider');
  return value;
}
