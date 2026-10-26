import { describe, expect, it } from 'vitest';
import { daysFrom, nextMidnightDelay, todayKey } from './dates';

describe('todayKey', () => {
  it('uses the pair timezone rather than UTC', () => {
    const instant = new Date('2026-10-26T03:30:00.000Z');
    expect(todayKey('America/New_York', instant)).toBe('2026-10-25');
    expect(todayKey('UTC', instant)).toBe('2026-10-26');
  });
});

describe('nextMidnightDelay', () => {
  it('reaches the next calendar date in that timezone', () => {
    const now = new Date('2026-10-25T21:00:00.000Z');
    const delay = nextMidnightDelay('America/New_York', now);
    const atBoundary = new Date(now.getTime() + delay);
    const justBefore = new Date(now.getTime() + delay - 2000);
    expect(todayKey('America/New_York', atBoundary)).toBe('2026-10-26');
    expect(todayKey('America/New_York', justBefore)).toBe('2026-10-25');
  });
});

describe('daysFrom', () => {
  it('includes both ends and crosses a month', () => {
    expect(daysFrom('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
  });

  it('is empty when the range runs backward', () => {
    expect(daysFrom('2026-11-02', '2026-10-30')).toEqual([]);
  });
});
