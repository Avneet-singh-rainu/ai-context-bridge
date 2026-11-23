import { describe, expect, it } from 'vitest';
import {
  collectContextItems,
  groupItems,
  type PackageNetwork,
  type PackagePage,
  type PackageScreenshot,
} from '../../src/renderer/src/features/context/context-model';
import {
  INITIAL_REVIEW,
  type ReviewState,
  reviewReducer,
} from '../../src/renderer/src/features/context/review-store';

const screenshot = (id: string): PackageScreenshot & { id: string } => ({
  id,
  fileName: `${id}.png`,
  format: 'png',
  width: 10,
  height: 10,
});

const page = (id: string): PackagePage & { id: string } => ({
  id,
  url: 'https://example.com/',
  title: id,
  extractedAt: '2026-11-23T06:40:00.000Z',
  selection: '',
  originalSelection: '',
  markdown: 'text',
  originalMarkdown: 'text',
  stats: { characters: 4, headings: 0, tables: 0, redactions: 0, truncated: false, scope: 'body' },
});

describe('collectContextItems', () => {
  it('lists notes, then screenshots, then pages, with prefixed ids and include flags', () => {
    const items = collectContextItems({
      notes: [{ id: 'n1', text: 'Why did churn drop?' }],
      screenshots: [screenshot('s1'), screenshot('s2')],
      pages: [page('p1')],
      excluded: { 'screenshot:s2': true },
    });
    expect(items.map((item) => [item.id, item.source, item.included])).toEqual([
      ['note:n1', 'note', true],
      ['screenshot:s1', 'screenshot', true],
      ['screenshot:s2', 'screenshot', false],
      ['page:p1', 'page', true],
    ]);
  });

  it('groups items by source in a fixed order and skips empty groups', () => {
    const items = collectContextItems({
      notes: [],
      screenshots: [screenshot('s1')],
      pages: [page('p1')],
      excluded: {},
    });
    expect(
      groupItems(items).map((group) => [group.source, group.label, group.items.length]),
    ).toEqual([
      ['screenshot', 'Screenshots', 1],
      ['page', 'Browser pages', 1],
    ]);
  });
});

describe('reviewReducer', () => {
  it('starts with everything included, detailed mode, and emails hidden', () => {
    expect(INITIAL_REVIEW).toEqual({
      excluded: {},
      optedIn: {},
      notes: [],
      mode: 'detailed',
      hideEmails: true,
      edit: null,
    });
  });

  it('leaves items out and brings them back, one or a whole group at a time', () => {
    let state: ReviewState = reviewReducer(INITIAL_REVIEW, {
      type: 'set-included',
      ids: ['screenshot:a', 'screenshot:b'],
      included: false,
    });
    expect(state.excluded).toEqual({ 'screenshot:a': true, 'screenshot:b': true });
    state = reviewReducer(state, { type: 'set-included', ids: ['screenshot:a'], included: true });
    expect(state.excluded).toEqual({ 'screenshot:b': true });
  });

  it('adds, edits, and removes notes, and forgets a removed note left out earlier', () => {
    let state = reviewReducer(INITIAL_REVIEW, { type: 'add-note', id: 'n1' });
    state = reviewReducer(state, { type: 'edit-note', id: 'n1', text: 'Goal: explain the drop' });
    state = reviewReducer(state, { type: 'set-included', ids: ['note:n1'], included: false });
    expect(state.notes).toEqual([{ id: 'n1', text: 'Goal: explain the drop' }]);
    state = reviewReducer(state, { type: 'remove-note', id: 'n1' });
    expect(state.notes).toEqual([]);
    expect(state.excluded).toEqual({});
  });

  it('keeps an edited copy of the package until the user discards it', () => {
    let state = reviewReducer(INITIAL_REVIEW, { type: 'start-edit', generated: '# Package' });
    expect(state.edit).toEqual({ text: '# Package', basedOn: '# Package' });
    state = reviewReducer(state, { type: 'edit-package', text: '# Package, trimmed' });
    expect(state.edit).toEqual({ text: '# Package, trimmed', basedOn: '# Package' });
    state = reviewReducer(state, { type: 'discard-edit' });
    expect(state.edit).toBeNull();
  });

  it('switches the export mode and the email option', () => {
    let state = reviewReducer(INITIAL_REVIEW, { type: 'set-mode', mode: 'compact' });
    state = reviewReducer(state, { type: 'set-hide-emails', hide: false });
    expect(state).toMatchObject({ mode: 'compact', hideEmails: false });
  });
});

describe('network items start left out', () => {
  const entry = (id: string): PackageNetwork & { id: string } => ({
    id,
    method: 'GET',
    endpoint: `https://api.example.com/${id}`,
    queryKeys: [],
    status: 200,
    mimeType: 'application/json',
    kind: 'json',
    calls: 1,
    originalBytes: 100,
    text: '{}',
    originalText: '{}',
    truncated: false,
    redactions: 0,
    pageUrl: 'https://example.com/',
    lastAt: '2026-11-23T08:00:00.000Z',
  });

  it('includes a network item only after the user opts in', () => {
    const items = collectContextItems({
      notes: [],
      screenshots: [],
      pages: [],
      network: [entry('a'), entry('b')],
      excluded: {},
      optedIn: { 'network:b': true },
    });
    expect(items.map((item) => [item.id, item.included])).toEqual([
      ['network:a', false],
      ['network:b', true],
    ]);
    expect(groupItems(items).map((group) => group.label)).toEqual(['Network data']);
  });

  it('switches network items on and off through opt-in, not the excluded list', () => {
    let state = reviewReducer(INITIAL_REVIEW, {
      type: 'set-included',
      ids: ['network:a', 'screenshot:s'],
      included: true,
    });
    expect(state.optedIn).toEqual({ 'network:a': true });
    expect(state.excluded).toEqual({});
    state = reviewReducer(state, {
      type: 'set-included',
      ids: ['network:a', 'screenshot:s'],
      included: false,
    });
    expect(state.optedIn).toEqual({});
    expect(state.excluded).toEqual({ 'screenshot:s': true });
  });
});
