// Extracted browser pages kept for the context package. Pure reducer, so Vitest can test it in
// Node.

import type { PageExtract } from '../../../../shared/page-content';

export interface PageEntry {
  id: string;
  /** What main returned; never changed, so Restore can bring it back. */
  extract: PageExtract;
  /** The page content the user sees and exports; starts as `extract.markdown`. */
  markdown: string;
  /** The selected text the user sees and exports; starts as `extract.selection`. */
  selection: string;
}

export type PageState = readonly PageEntry[];

export type PageAction =
  | { type: 'add'; id: string; extract: PageExtract }
  | { type: 'remove'; id: string }
  | { type: 'edit'; id: string; field: 'markdown' | 'selection'; text: string }
  | { type: 'restore'; id: string };

export function pageReducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case 'add': {
      const { extract } = action;
      return [
        ...state,
        { id: action.id, extract, markdown: extract.markdown, selection: extract.selection },
      ];
    }
    case 'remove': {
      const next = state.filter((page) => page.id !== action.id);
      return next.length === state.length ? state : next;
    }
    case 'edit': {
      if (!state.some((page) => page.id === action.id)) return state;
      return state.map((page) =>
        page.id === action.id ? { ...page, [action.field]: action.text } : page,
      );
    }
    case 'restore': {
      if (!state.some((page) => page.id === action.id)) return state;
      return state.map((page) =>
        page.id === action.id
          ? { ...page, markdown: page.extract.markdown, selection: page.extract.selection }
          : page,
      );
    }
  }
}
