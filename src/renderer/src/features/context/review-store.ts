// Review state for the unified context: what is left out, user notes, export options, and an
// edited copy of the package. Source data lives in its own stores. Pure reducer, so Vitest can
// test it in Node.

import { isOptInId, type UserNote } from './context-model';

export type ExportMode = 'detailed' | 'compact';

export interface ReviewState {
  /** Item ids left out of the package; anything not listed is included. */
  excluded: Readonly<Record<string, true>>;
  /** Opt-in item ids (network responses) switched on; anything not listed is left out. */
  optedIn: Readonly<Record<string, true>>;
  notes: readonly UserNote[];
  mode: ExportMode;
  hideEmails: boolean;
  /** Set while the user edits the final text: the edited text and the package it started from. */
  edit: { text: string; basedOn: string } | null;
}

export const INITIAL_REVIEW: ReviewState = {
  excluded: {},
  optedIn: {},
  notes: [],
  mode: 'detailed',
  hideEmails: true,
  edit: null,
};

export type ReviewAction =
  | { type: 'set-included'; ids: readonly string[]; included: boolean }
  | { type: 'add-note'; id: string }
  | { type: 'edit-note'; id: string; text: string }
  | { type: 'remove-note'; id: string }
  | { type: 'set-mode'; mode: ExportMode }
  | { type: 'set-hide-emails'; hide: boolean }
  | { type: 'start-edit'; generated: string }
  | { type: 'edit-package'; text: string }
  | { type: 'discard-edit' };

function withoutIds(
  excluded: ReviewState['excluded'],
  ids: readonly string[],
): ReviewState['excluded'] {
  const next = { ...excluded };
  for (const id of ids) delete next[id];
  return next;
}

export function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'set-included': {
      // Opt-in items (network) are switched on in optedIn; all others are switched off in excluded.
      const optIn = action.ids.filter(isOptInId);
      const optOut = action.ids.filter((id) => !isOptInId(id));
      let { excluded, optedIn } = state;
      const withIds = (current: ReviewState['excluded'], ids: readonly string[]) => {
        const next: Record<string, true> = { ...current };
        for (const id of ids) next[id] = true;
        return next;
      };
      if (action.included) {
        excluded = withoutIds(excluded, optOut);
        optedIn = withIds(optedIn, optIn);
      } else {
        optedIn = withoutIds(optedIn, optIn);
        excluded = withIds(excluded, optOut);
      }
      return { ...state, excluded, optedIn };
    }
    case 'add-note':
      return { ...state, notes: [...state.notes, { id: action.id, text: '' }] };
    case 'edit-note':
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.id ? { ...note, text: action.text } : note,
        ),
      };
    case 'remove-note':
      return {
        ...state,
        notes: state.notes.filter((note) => note.id !== action.id),
        excluded: withoutIds(state.excluded, [`note:${action.id}`]),
      };
    case 'set-mode':
      return { ...state, mode: action.mode };
    case 'set-hide-emails':
      return { ...state, hideEmails: action.hide };
    case 'start-edit':
      return { ...state, edit: { text: action.generated, basedOn: action.generated } };
    case 'edit-package':
      return state.edit ? { ...state, edit: { ...state.edit, text: action.text } } : state;
    case 'discard-edit':
      return { ...state, edit: null };
  }
}
