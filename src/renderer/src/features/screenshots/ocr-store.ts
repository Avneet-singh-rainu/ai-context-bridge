// OCR results stored by screenshot id. Pure reducer, so Vitest can test it in Node.

import type { OcrEngineId, OcrResult } from '../../../../shared/ipc-contract';

export interface OcrEntry {
  status: 'running' | 'done' | 'failed';
  engine?: OcrEngineId;
  /** The text exactly as the OCR engine returned it. */
  extractedText: string;
  /** The text the user sees and exports; starts equal to `extractedText`, then follows edits. */
  text: string;
  confidence?: number;
  fallbackReason?: string;
  error?: string;
}

export type OcrState = Readonly<Record<string, OcrEntry>>;

export type OcrAction =
  | { type: 'start'; id: string }
  | { type: 'succeed'; id: string; result: OcrResult }
  | { type: 'fail'; id: string; error: string }
  | { type: 'edit'; id: string; text: string }
  | { type: 'restore'; id: string }
  | { type: 'forget'; id: string };

/** A screenshot needs OCR when it has never run or the last run failed. */
export function needsExtraction(entry: OcrEntry | undefined): boolean {
  return entry === undefined || entry.status === 'failed';
}

export function ocrReducer(state: OcrState, action: OcrAction): OcrState {
  const current = state[action.id];
  switch (action.type) {
    case 'start':
      return { ...state, [action.id]: { status: 'running', extractedText: '', text: '' } };
    case 'succeed': {
      const { engine, text, confidence, fallbackReason } = action.result;
      return {
        ...state,
        [action.id]: {
          status: 'done',
          engine,
          extractedText: text,
          text,
          confidence,
          fallbackReason,
        },
      };
    }
    case 'fail':
      return {
        ...state,
        [action.id]: { status: 'failed', extractedText: '', text: '', error: action.error },
      };
    case 'edit':
      if (current?.status !== 'done') return state;
      return { ...state, [action.id]: { ...current, text: action.text } };
    case 'restore':
      if (current?.status !== 'done') return state;
      return { ...state, [action.id]: { ...current, text: current.extractedText } };
    case 'forget': {
      if (current === undefined) return state;
      const { [action.id]: _removed, ...rest } = state;
      return rest;
    }
  }
}
