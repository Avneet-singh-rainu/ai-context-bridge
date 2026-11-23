// The unified context model: every source becomes a context item with the same outer shape, so
// review, grouping, counting, and export work on one list. Each source keeps its own store; this
// module only converts. Pure functions, so Vitest can test them in Node.

import type { ImageFormat } from '../../../../shared/image-format';
import type { ScreenshotSource } from '../../../../shared/ipc-contract';
import type { PageStats } from '../../../../shared/page-content';
import type { OcrEntry } from '../screenshots/ocr-store';

/** Every kind of source. `network` (M6) and `tooltip` (hover capture) have no items yet. */
export type ContextSource = 'note' | 'screenshot' | 'page' | 'network' | 'tooltip';

export const SOURCE_ORDER: readonly ContextSource[] = [
  'note',
  'screenshot',
  'page',
  'network',
  'tooltip',
];

export const SOURCE_LABELS: Record<ContextSource, string> = {
  note: 'Your notes',
  screenshot: 'Screenshots',
  page: 'Browser pages',
  network: 'Network data',
  tooltip: 'Tooltips',
};

/** A note the user types for the AI, such as the goal or the question. */
export interface UserNote {
  id: string;
  text: string;
}

export interface PackageScreenshot {
  fileName: string;
  format: ImageFormat;
  width: number;
  height: number;
  ocr?: OcrEntry;
  /** Set for browser captures: the page the screenshot was taken from. */
  source?: ScreenshotSource;
}

/** A browser page extracted with Extract page text, after the user's review. */
export interface PackagePage {
  url: string;
  title: string;
  extractedAt: string;
  selection: string;
  originalSelection: string;
  markdown: string;
  originalMarkdown: string;
  stats: PageStats;
}

interface ItemBase {
  /** `<source>:<id in its store>`, unique across all sources. */
  id: string;
  included: boolean;
}

export type ContextItem =
  | (ItemBase & { source: 'note'; note: UserNote })
  | (ItemBase & { source: 'screenshot'; screenshot: PackageScreenshot })
  | (ItemBase & { source: 'page'; page: PackagePage });

export interface ContextSources {
  notes: readonly UserNote[];
  screenshots: readonly (PackageScreenshot & { id: string })[];
  pages: readonly (PackagePage & { id: string })[];
  /** Item ids the user left out of the package. */
  excluded: Readonly<Record<string, true>>;
}

/** One ordered list: notes, then screenshots, then pages, each in its own store's order. */
export function collectContextItems(sources: ContextSources): ContextItem[] {
  const included = (id: string) => sources.excluded[id] !== true;
  return [
    ...sources.notes.map((note): ContextItem => {
      const id = `note:${note.id}`;
      return { id, source: 'note', included: included(id), note };
    }),
    ...sources.screenshots.map(({ id: storeId, ...screenshot }): ContextItem => {
      const id = `screenshot:${storeId}`;
      return { id, source: 'screenshot', included: included(id), screenshot };
    }),
    ...sources.pages.map(({ id: storeId, ...page }): ContextItem => {
      const id = `page:${storeId}`;
      return { id, source: 'page', included: included(id), page };
    }),
  ];
}

export interface ContextGroup {
  source: ContextSource;
  label: string;
  items: ContextItem[];
}

/** Items grouped by source in SOURCE_ORDER; sources without items are left out. */
export function groupItems(items: readonly ContextItem[]): ContextGroup[] {
  return SOURCE_ORDER.map((source) => ({
    source,
    label: SOURCE_LABELS[source],
    items: items.filter((item) => item.source === source),
  })).filter((group) => group.items.length > 0);
}
