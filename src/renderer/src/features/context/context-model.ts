// The unified context model: every source becomes a context item with the same outer shape, so
// review, grouping, counting, and export work on one list. Each source keeps its own store; this
// module only converts. Pure functions, so Vitest can test them in Node.

import type { ImageFormat } from '../../../../shared/image-format';
import type { ScreenshotSource } from '../../../../shared/ipc-contract';
import type { NetworkEntry } from '../../../../shared/network';
import type { PageStats } from '../../../../shared/page-content';
import type { OcrEntry } from '../screenshots/ocr-store';

/** Every kind of source. `tooltip` (hover capture) has no items yet. */
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

/** A recorded API response after the user's review; `originalText` is what main kept. */
export interface PackageNetwork extends Omit<NetworkEntry, 'id'> {
  originalText: string;
}

/** Sources whose items start left out: the user switches each one on. */
export const OPT_IN_SOURCES: readonly ContextSource[] = ['network'];

/** True for ids of items that start left out (network responses). */
export function isOptInId(id: string): boolean {
  return OPT_IN_SOURCES.some((source) => id.startsWith(`${source}:`));
}

interface ItemBase {
  /** `<source>:<id in its store>`, unique across all sources. */
  id: string;
  included: boolean;
}

export type ContextItem =
  | (ItemBase & { source: 'note'; note: UserNote })
  | (ItemBase & { source: 'screenshot'; screenshot: PackageScreenshot })
  | (ItemBase & { source: 'page'; page: PackagePage })
  | (ItemBase & { source: 'network'; network: PackageNetwork });

export interface ContextSources {
  notes: readonly UserNote[];
  screenshots: readonly (PackageScreenshot & { id: string })[];
  pages: readonly (PackagePage & { id: string })[];
  network?: readonly (PackageNetwork & { id: string })[];
  /** Item ids the user left out of the package. */
  excluded: Readonly<Record<string, true>>;
  /** Ids of opt-in items (network responses) the user switched on. */
  optedIn?: Readonly<Record<string, true>>;
}

/**
 * One ordered list: notes, screenshots, pages, then network responses, each in its own store's
 * order. Network responses are included only when switched on; everything else unless left out.
 */
export function collectContextItems(sources: ContextSources): ContextItem[] {
  const optedIn = sources.optedIn ?? {};
  const included = (id: string) =>
    isOptInId(id) ? optedIn[id] === true : sources.excluded[id] !== true;
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
    ...(sources.network ?? []).map(({ id: storeId, ...network }): ContextItem => {
      const id = `network:${storeId}`;
      return { id, source: 'network', included: included(id), network };
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
