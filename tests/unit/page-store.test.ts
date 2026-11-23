import { describe, expect, it } from 'vitest';
import { type PageState, pageReducer } from '../../src/renderer/src/features/context/page-store';
import type { PageExtract } from '../../src/shared/page-content';

const extract = (title: string): PageExtract => ({
  url: `https://example.com/${title}`,
  title,
  extractedAt: '2026-11-23T06:40:00.000Z',
  selection: 'picked',
  markdown: `# ${title}`,
  stats: { characters: 10, headings: 1, tables: 0, redactions: 0, truncated: false, scope: 'main' },
});

describe('pageReducer', () => {
  it('adds pages in order and keeps editable copies of the text', () => {
    let state: PageState = [];
    state = pageReducer(state, { type: 'add', id: 'a', extract: extract('one') });
    state = pageReducer(state, { type: 'add', id: 'b', extract: extract('two') });
    expect(state.map((page) => page.id)).toEqual(['a', 'b']);
    expect(state[0]).toMatchObject({ markdown: '# one', selection: 'picked' });
  });

  it('edits and restores one field without touching the original', () => {
    let state = pageReducer([], { type: 'add', id: 'a', extract: extract('one') });
    state = pageReducer(state, { type: 'edit', id: 'a', field: 'markdown', text: '# edited' });
    state = pageReducer(state, { type: 'edit', id: 'a', field: 'selection', text: '' });
    expect(state[0]).toMatchObject({ markdown: '# edited', selection: '' });
    expect(state[0].extract.markdown).toBe('# one');
    state = pageReducer(state, { type: 'restore', id: 'a' });
    expect(state[0]).toMatchObject({ markdown: '# one', selection: 'picked' });
  });

  it('removes a page and ignores unknown ids', () => {
    const state = pageReducer([], { type: 'add', id: 'a', extract: extract('one') });
    expect(pageReducer(state, { type: 'remove', id: 'a' })).toEqual([]);
    expect(pageReducer(state, { type: 'remove', id: 'zzz' })).toBe(state);
    expect(pageReducer(state, { type: 'edit', id: 'zzz', field: 'markdown', text: 'x' })).toBe(
      state,
    );
  });
});
