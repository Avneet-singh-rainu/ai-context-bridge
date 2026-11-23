/** Mouse moves are capped at about 30 per second so CDP input does not flood the page. */
export const MOUSE_MOVE_INTERVAL_MS = 33;

export interface LastMouseMove {
  at: number;
  x: number;
  y: number;
}

/** Returns true only when enough time passed and the pointer changed position. */
export function shouldSendMouseMove(
  now: number,
  x: number,
  y: number,
  last: LastMouseMove | null,
): boolean {
  if (!last) return true;
  if (now - last.at < MOUSE_MOVE_INTERVAL_MS) return false;
  return Math.abs(x - last.x) >= 1 || Math.abs(y - last.y) >= 1;
}
