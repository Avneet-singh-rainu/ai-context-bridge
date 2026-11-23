import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW, NAV_ITEMS } from '../../src/renderer/src/components/navigation';

describe('NAV_ITEMS', () => {
  it('lists Browser, Screenshots and Context in that order', () => {
    expect(NAV_ITEMS.map((item) => item.id)).toEqual(['browser', 'screenshots', 'context']);
  });

  it('starts on a view that exists in the list', () => {
    expect(NAV_ITEMS.some((item) => item.id === DEFAULT_VIEW)).toBe(true);
  });
});
