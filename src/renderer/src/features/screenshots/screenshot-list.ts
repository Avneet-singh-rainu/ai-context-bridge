// Pure list logic for imported screenshots. Generic over the item type, so Vitest can test it in
// Node without browser types such as File.

export type ScreenshotListAction<T> =
  | { type: 'add'; items: readonly T[] }
  | { type: 'remove'; id: string }
  | { type: 'move'; id: string; toIndex: number };

export function screenshotListReducer<T extends { id: string }>(
  list: readonly T[],
  action: ScreenshotListAction<T>,
): readonly T[] {
  switch (action.type) {
    case 'add':
      return action.items.length === 0 ? list : [...list, ...action.items];
    case 'remove': {
      const next = list.filter((item) => item.id !== action.id);
      return next.length === list.length ? list : next;
    }
    case 'move': {
      const from = list.findIndex((item) => item.id === action.id);
      const to = action.toIndex;
      if (from === -1 || to < 0 || to >= list.length || to === from) return list;
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    }
  }
}
