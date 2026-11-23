import { describe, expect, it } from 'vitest';
import { buildPageExtract, sanitizeExtraction } from '../../src/main/browser/page-result';
import { blocksToMarkdown, PAGE_LIMITS, type PageBlock } from '../../src/shared/page-content';

describe('blocksToMarkdown', () => {
  it('turns headings, text, lists, code, and tables into Markdown', () => {
    const blocks: PageBlock[] = [
      { type: 'heading', level: 1, text: 'Orders' },
      { type: 'text', text: 'Three orders this week.' },
      { type: 'list-item', depth: 0, text: 'Shipped' },
      { type: 'list-item', depth: 1, text: 'By courier' },
      { type: 'pre', text: 'npm test' },
      {
        type: 'table',
        caption: 'Weekly orders',
        rows: [['Order', 'Total'], ['A|1', '12.50'], ['B2']],
      },
    ];
    const result = blocksToMarkdown(blocks);
    expect(result.markdown).toBe(
      [
        '# Orders',
        'Three orders this week.',
        '- Shipped\n  - By courier',
        '```\nnpm test\n```',
        'Table: Weekly orders\n| Order | Total |\n| --- | --- |\n| A\\|1 | 12.50 |\n| B2 |   |',
      ].join('\n\n'),
    );
    expect(result).toMatchObject({ truncated: false, headings: 1, tables: 1 });
  });

  it('stops at a block boundary when the size limit is reached', () => {
    const paragraph = 'x'.repeat(30_000);
    const result = blocksToMarkdown([
      { type: 'text', text: paragraph },
      { type: 'text', text: paragraph },
    ]);
    expect(result.markdown).toBe(paragraph);
    expect(result.truncated).toBe(true);
  });
});

describe('sanitizeExtraction', () => {
  it('rejects a result that is not an object with blocks', () => {
    expect(sanitizeExtraction(null)).toMatchObject({ ok: false });
    expect(sanitizeExtraction({ title: 'x' })).toMatchObject({ ok: false });
  });

  it('drops unknown blocks and clamps sizes', () => {
    const tooManyRows = Array.from({ length: PAGE_LIMITS.maxRows + 5 }, (_, i) => [`r${i}`]);
    const result = sanitizeExtraction({
      title: 'Page',
      scope: 'main',
      selection: 's'.repeat(PAGE_LIMITS.maxSelection + 1),
      truncated: false,
      blocks: [
        { type: 'script', text: 'alert(1)' },
        { type: 'heading', level: 9, text: 'Too deep' },
        { type: 'table', rows: tooManyRows },
        { type: 'table', rows: [['c'.repeat(PAGE_LIMITS.maxCell + 50)]] },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.blocks.map((block) => block.type)).toEqual(['heading', 'table', 'table']);
    expect(result.blocks[0]).toMatchObject({ level: 6 });
    expect((result.blocks[1] as { rows: string[][] }).rows).toHaveLength(PAGE_LIMITS.maxRows);
    expect((result.blocks[2] as { rows: string[][] }).rows[0][0]).toHaveLength(PAGE_LIMITS.maxCell);
    expect(result.selection).toHaveLength(PAGE_LIMITS.maxSelection);
    expect(result.truncated).toBe(true);
  });

  it('keeps at most the table limit', () => {
    const tables = Array.from({ length: PAGE_LIMITS.maxTables + 3 }, () => ({
      type: 'table',
      rows: [['a']],
    }));
    const result = sanitizeExtraction({ title: '', blocks: tables });
    expect(result.ok && result.blocks.length).toBe(PAGE_LIMITS.maxTables);
    expect(result.ok && result.truncated).toBe(true);
  });
});

describe('buildPageExtract', () => {
  it('builds Markdown, redacts secrets, and counts what it found', () => {
    const sanitized = sanitizeExtraction({
      title: 'Settings',
      scope: 'article',
      selection: 'api_key=abcd1234efgh',
      blocks: [
        { type: 'heading', level: 2, text: 'API access' },
        { type: 'text', text: `Your key: AKIAIOSFODNN7EXAMPLE` },
      ],
    });
    if (!sanitized.ok) throw new Error('expected ok');
    const page = buildPageExtract(sanitized, 'https://app.example/settings?tab=api', new Date(0));
    expect(page.markdown).toBe('## API access\n\nYour key: [REDACTED]');
    expect(page.selection).toBe('api_key=[REDACTED]');
    expect(page).toMatchObject({
      url: 'https://app.example/settings?tab=api',
      title: 'Settings',
      extractedAt: '1970-01-01T00:00:00.000Z',
      stats: { headings: 1, tables: 0, redactions: 2, truncated: false, scope: 'article' },
    });
    expect(page.stats.characters).toBe(page.markdown.length);
  });
});
