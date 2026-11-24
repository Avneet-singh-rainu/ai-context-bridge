/** Pure rules for browser tab identity. Electron objects stay in `browser-view.ts`. */

export interface TabIdentity {
  id: string;
}

/** The active tab after a close: the next tab to the right, or the last tab to the left. */
export function activeAfterClose(
  tabs: readonly TabIdentity[],
  closingId: string,
  currentActiveId: string | null,
): string | null {
  const closingIndex = tabs.findIndex((tab) => tab.id === closingId);
  if (closingIndex < 0) return currentActiveId;
  if (currentActiveId !== closingId) return currentActiveId;

  const remaining = tabs.filter((tab) => tab.id !== closingId);
  return remaining.length === 0 ? null : remaining[Math.min(closingIndex, remaining.length - 1)].id;
}

/** New tabs open next to the active tab, or at the end when no tab is active. */
export function insertAfterActive(tabs: readonly TabIdentity[], activeId: string | null): number {
  if (!activeId) return tabs.length;
  const index = tabs.findIndex((tab) => tab.id === activeId);
  return index < 0 ? tabs.length : index + 1;
}
