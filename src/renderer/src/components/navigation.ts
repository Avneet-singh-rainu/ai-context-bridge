export type ViewId = 'browser' | 'screenshots' | 'context';

export interface NavItem {
  id: ViewId;
  label: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'browser', label: 'Browser' },
  { id: 'screenshots', label: 'Screenshots' },
  { id: 'context', label: 'Context' },
];

export const DEFAULT_VIEW: ViewId = 'browser';
