// Page content types, limits, and Markdown rendering. Pure functions shared by main (which builds
// the Markdown) and the renderer (which shows the limits). No DOM and no Node APIs.

/** One piece of page content, in page order, as the extraction script reports it. */
export type PageBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'text'; text: string }
  | { type: 'list-item'; depth: number; text: string }
  | { type: 'pre'; text: string }
  | { type: 'table'; rows: string[][]; caption?: string };

export type PageScope = 'main' | 'article' | 'body';

export const PAGE_LIMITS = {
  /** Characters of Markdown per page; content is cut at a block boundary. */
  maxChars: 50_000,
  maxTables: 20,
  maxRows: 100,
  maxCols: 15,
  maxCell: 300,
  maxSelection: 10_000,
  maxTitle: 500,
  maxBlocks: 5_000,
  /** Characters per text block before it is cut. */
  maxBlockText: 20_000,
  /** Pages kept in the context package at once. */
  maxPages: 10,
} as const;

export interface PageStats {
  characters: number;
  headings: number;
  tables: number;
  redactions: number;
  /** True when anything was cut: content, tables, rows, cells, or the selection. */
  truncated: boolean;
  scope: PageScope;
}

/** What main returns for one Extract page text: already limited and redacted. */
export interface PageExtract {
  url: string;
  title: string;
  /** ISO 8601 time of the extraction. */
  extractedAt: string;
  selection: string;
  markdown: string;
  stats: PageStats;
}

function tableToMarkdown(rows: readonly string[][], caption?: string): string {
  const width = Math.max(1, ...rows.map((row) => row.length));
  const cell = (text: string) => text.replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|') || ' ';
  const padded = rows.map((row) => Array.from({ length: width }, (_, i) => cell(row[i] ?? '')));
  const line = (row: string[]) => `| ${row.join(' | ')} |`;
  const lines = [line(padded[0]), line(padded[0].map(() => '---')), ...padded.slice(1).map(line)];
  return caption ? `Table: ${caption}\n${lines.join('\n')}` : lines.join('\n');
}

function blockToMarkdown(block: PageBlock): string {
  switch (block.type) {
    case 'heading':
      return `${'#'.repeat(block.level)} ${block.text}`;
    case 'text':
      return block.text;
    case 'list-item':
      return `${'  '.repeat(block.depth)}- ${block.text}`;
    case 'pre':
      return `\`\`\`\n${block.text}\n\`\`\``;
    case 'table':
      return block.rows.length > 0 ? tableToMarkdown(block.rows, block.caption) : '';
  }
}

/**
 * Renders blocks as Markdown, at most PAGE_LIMITS.maxChars characters. Consecutive list items
 * stay in one list; other blocks are separated by a blank line. Stops before the first block
 * that would go over the limit.
 */
export function blocksToMarkdown(blocks: readonly PageBlock[]): {
  markdown: string;
  truncated: boolean;
  headings: number;
  tables: number;
} {
  let markdown = '';
  let headings = 0;
  let tables = 0;
  let previous: PageBlock['type'] | null = null;

  for (const block of blocks) {
    const piece = blockToMarkdown(block);
    if (piece.trim() === '') continue;
    const separator =
      markdown === '' ? '' : previous === 'list-item' && block.type === 'list-item' ? '\n' : '\n\n';
    if (markdown.length + separator.length + piece.length > PAGE_LIMITS.maxChars) {
      return { markdown, truncated: true, headings, tables };
    }
    markdown += separator + piece;
    previous = block.type;
    if (block.type === 'heading') headings += 1;
    if (block.type === 'table') tables += 1;
  }
  return { markdown, truncated: false, headings, tables };
}
