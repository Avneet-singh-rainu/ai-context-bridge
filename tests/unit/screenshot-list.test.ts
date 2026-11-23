import { describe, expect, it } from 'vitest';
import { screenshotListReducer } from '../../src/renderer/src/features/screenshots/screenshot-list';

const item = (id: string) => ({ id });
const ids = (list: readonly { id: string }[]) => list.map((entry) => entry.id);

describe('screenshotListReducer', () => {
  const start = [item('a'), item('b'), item('c')];

  it('adds new screenshots at the end, in import order', () => {
    const next = screenshotListReducer(start, { type: 'add', items: [item('d'), item('e')] });
    expect(ids(next)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('removes one screenshot by id', () => {
    expect(ids(screenshotListReducer(start, { type: 'remove', id: 'b' }))).toEqual(['a', 'c']);
  });

  it('moves a screenshot to a new position', () => {
    expect(ids(screenshotListReducer(start, { type: 'move', id: 'a', toIndex: 2 }))).toEqual([
      'b',
      'c',
      'a',
    ]);
    expect(ids(screenshotListReducer(start, { type: 'move', id: 'c', toIndex: 0 }))).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('returns the same list when a move or remove changes nothing', () => {
    expect(screenshotListReducer(start, { type: 'move', id: 'a', toIndex: -1 })).toBe(start);
    expect(screenshotListReducer(start, { type: 'move', id: 'c', toIndex: 3 })).toBe(start);
    expect(screenshotListReducer(start, { type: 'move', id: 'x', toIndex: 0 })).toBe(start);
    expect(screenshotListReducer(start, { type: 'remove', id: 'x' })).toBe(start);
  });

  it('does not change the input list', () => {
    screenshotListReducer(start, { type: 'move', id: 'a', toIndex: 2 });
    expect(ids(start)).toEqual(['a', 'b', 'c']);
  });
});
