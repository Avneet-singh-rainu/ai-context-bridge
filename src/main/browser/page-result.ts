// Checks the extraction script's result and builds the page extract. The script runs inside a web
// page, so its output is treated as untrusted input. No Electron imports, so Vitest can test it.

import {
  blocksToMarkdown,
  PAGE_LIMITS,
  type PageBlock,
  type PageExtract,
  type PageScope,
} from '../../shared/page-content';
import { redactSecrets } from '../../shared/redact';

export type SanitizedExtraction =
  | {
      ok: true;
      title: string;
      selection: string;
      scope: PageScope;
      blocks: PageBlock[];
      truncated: boolean;
    }
  | { ok: false; error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Cuts a string to `max` characters and reports whether it cut. */
function clamp(value: unknown, max: number): { text: string; cut: boolean } {
  const text = typeof value === 'string' ? value : '';
  return text.length > max ? { text: text.slice(0, max), cut: true } : { text, cut: false };
}

export function sanitizeExtraction(raw: unknown): SanitizedExtraction {
  if (!isObject(raw) || !Array.isArray(raw.blocks)) {
    return { ok: false, error: 'The page content could not be read.' };
  }
  let truncated = raw.truncated === true || raw.blocks.length > PAGE_LIMITS.maxBlocks;
  const blocks: PageBlock[] = [];
  let tables = 0;

  for (const item of raw.blocks.slice(0, PAGE_LIMITS.maxBlocks)) {
    if (!isObject(item)) continue;
    if (item.type === 'table') {
      if (!Array.isArray(item.rows)) continue;
      if (tables >= PAGE_LIMITS.maxTables) {
        truncated = true;
        continue;
      }
      tables += 1;
      if (item.rows.length > PAGE_LIMITS.maxRows) truncated = true;
      const rows = item.rows.slice(0, PAGE_LIMITS.maxRows).map((row) => {
        const cells = Array.isArray(row) ? row : [];
        if (cells.length > PAGE_LIMITS.maxCols) truncated = true;
        return cells.slice(0, PAGE_LIMITS.maxCols).map((cell) => {
          const clamped = clamp(cell, PAGE_LIMITS.maxCell);
          if (clamped.cut) truncated = true;
          return clamped.text;
        });
      });
      const caption = clamp(item.caption, PAGE_LIMITS.maxCell).text;
      blocks.push(caption ? { type: 'table', rows, caption } : { type: 'table', rows });
      continue;
    }
    const text = clamp(item.text, PAGE_LIMITS.maxBlockText);
    if (text.cut) truncated = true;
    if (item.type === 'heading') {
      const level = Math.min(6, Math.max(1, Math.round(Number(item.level) || 1)));
      blocks.push({ type: 'heading', level, text: text.text });
    } else if (item.type === 'list-item') {
      const depth = Math.min(6, Math.max(0, Math.round(Number(item.depth) || 0)));
      blocks.push({ type: 'list-item', depth, text: text.text });
    } else if (item.type === 'text' || item.type === 'pre') {
      blocks.push({ type: item.type, text: text.text });
    }
  }

  const selection = clamp(raw.selection, PAGE_LIMITS.maxSelection);
  if (selection.cut) truncated = true;
  const scope: PageScope = raw.scope === 'main' || raw.scope === 'article' ? raw.scope : 'body';
  return {
    ok: true,
    title: clamp(raw.title, PAGE_LIMITS.maxTitle).text,
    selection: selection.text.trim(),
    scope,
    blocks,
    truncated,
  };
}

/** Renders the Markdown, then redacts secrets before anything leaves the main process. */
export function buildPageExtract(
  sanitized: Extract<SanitizedExtraction, { ok: true }>,
  url: string,
  now: Date,
): PageExtract {
  const rendered = blocksToMarkdown(sanitized.blocks);
  const markdown = redactSecrets(rendered.markdown);
  const selection = redactSecrets(sanitized.selection);
  const title = redactSecrets(sanitized.title);
  return {
    url,
    title: title.text,
    extractedAt: now.toISOString(),
    selection: selection.text,
    markdown: markdown.text,
    stats: {
      characters: markdown.text.length,
      headings: rendered.headings,
      tables: rendered.tables,
      redactions: markdown.count + selection.count + title.count,
      truncated: sanitized.truncated || rendered.truncated,
      scope: sanitized.scope,
    },
  };
}
