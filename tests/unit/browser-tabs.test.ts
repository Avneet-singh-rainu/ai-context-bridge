import { describe, expect, it } from 'vitest';
import { activeAfterClose, insertAfterActive } from '../../src/main/browser/tab-model';

const tabs = [{ id: 'tab-1' }, { id: 'tab-2' }, { id: 'tab-3' }];

describe('activeAfterClose', () => {
  it('activates the tab to the right when the active tab closes', () => {
    expect(activeAfterClose(tabs, 'tab-1', 'tab-1')).toBe('tab-2');
  });

  it('activates the tab to the left when the last tab closes', () => {
    expect(activeAfterClose(tabs, 'tab-3', 'tab-3')).toBe('tab-2');
  });

  it('keeps the active tab when another tab closes', () => {
    expect(activeAfterClose(tabs, 'tab-1', 'tab-3')).toBe('tab-3');
  });

  it('returns null when the last tab closes', () => {
    expect(activeAfterClose([{ id: 'tab-1' }], 'tab-1', 'tab-1')).toBeNull();
  });

  it('ignores an unknown tab id', () => {
    expect(activeAfterClose(tabs, 'missing', 'tab-2')).toBe('tab-2');
  });
});

describe('insertAfterActive', () => {
  it('places a new tab next to the active tab', () => {
    expect(insertAfterActive(tabs, 'tab-1')).toBe(1);
  });

  it('places a new tab at the end when no tab is active', () => {
    expect(insertAfterActive(tabs, null)).toBe(3);
  });

  it('places a new tab at the end for an unknown active tab', () => {
    expect(insertAfterActive(tabs, 'missing')).toBe(3);
  });
});
