import { describe, expect, it } from 'vitest';
import { MOUSE_MOVE_INTERVAL_MS, shouldSendMouseMove } from '../../src/shared/input-throttle';

describe('shouldSendMouseMove', () => {
  it('allows the first move', () => {
    expect(shouldSendMouseMove(100, 10, 20, null)).toBe(true);
  });

  it('drops moves inside the interval', () => {
    expect(
      shouldSendMouseMove(100 + MOUSE_MOVE_INTERVAL_MS - 1, 50, 60, { at: 100, x: 10, y: 20 }),
    ).toBe(false);
  });

  it('allows a moved pointer after the interval', () => {
    expect(
      shouldSendMouseMove(100 + MOUSE_MOVE_INTERVAL_MS, 50, 60, { at: 100, x: 10, y: 20 }),
    ).toBe(true);
  });

  it('drops a repeated position after the interval', () => {
    expect(shouldSendMouseMove(200, 10, 20, { at: 100, x: 10, y: 20 })).toBe(false);
  });
});
