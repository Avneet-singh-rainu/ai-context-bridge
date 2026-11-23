import { createContext, type ReactNode, useContext, useMemo, useReducer } from 'react';
import { type ExportMode, INITIAL_REVIEW, type ReviewState, reviewReducer } from './review-store';

interface ContextReviewValue {
  review: ReviewState;
  setIncluded: (ids: readonly string[], included: boolean) => void;
  addNote: () => void;
  editNote: (id: string, text: string) => void;
  removeNote: (id: string) => void;
  setMode: (mode: ExportMode) => void;
  setHideEmails: (hide: boolean) => void;
  startEdit: (generated: string) => void;
  editPackage: (text: string) => void;
  discardEdit: () => void;
}

const ContextReviewContext = createContext<ContextReviewValue | null>(null);

let noteCounter = 0;

/** Review state above the workspaces, so left-out items, notes, and edits survive view switches. */
export function ContextReviewProvider({ children }: { children: ReactNode }) {
  const [review, dispatch] = useReducer(reviewReducer, INITIAL_REVIEW);

  const value = useMemo<ContextReviewValue>(
    () => ({
      review,
      setIncluded: (ids, included) => dispatch({ type: 'set-included', ids, included }),
      addNote: () => {
        noteCounter += 1;
        dispatch({ type: 'add-note', id: `n${noteCounter}` });
      },
      editNote: (id, text) => dispatch({ type: 'edit-note', id, text }),
      removeNote: (id) => dispatch({ type: 'remove-note', id }),
      setMode: (mode) => dispatch({ type: 'set-mode', mode }),
      setHideEmails: (hide) => dispatch({ type: 'set-hide-emails', hide }),
      startEdit: (generated) => dispatch({ type: 'start-edit', generated }),
      editPackage: (text) => dispatch({ type: 'edit-package', text }),
      discardEdit: () => dispatch({ type: 'discard-edit' }),
    }),
    [review],
  );

  return <ContextReviewContext.Provider value={value}>{children}</ContextReviewContext.Provider>;
}

export function useContextReview(): ContextReviewValue {
  const value = useContext(ContextReviewContext);
  if (!value) throw new Error('useContextReview must be used inside ContextReviewProvider');
  return value;
}
