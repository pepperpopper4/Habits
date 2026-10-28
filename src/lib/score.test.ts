import { describe, expect, it } from 'vitest';
import type { Check, Track } from '../types';
import { formatChange, formatPoints, pointsForDay, scoreParticipant, settledScore } from './score';

const habit: Track = {
  id: 'habit',
  pair_id: 'pair',
  owner_id: 'alex',
  offer_id: null,
  name: 'Walk',
  kind: 'habit',
  gain: 2,
  loss: 1,
  starts_on: '2026-10-24',
  weekdays: 127,
  visibility: 'private',
  created_at: '2026-10-24T00:00:00.000Z',
};

const vice: Track = {
  ...habit,
  id: 'vice',
  name: 'Soda',
  kind: 'vice',
  gain: 3,
  loss: 4,
};

function check(trackId: string, day: string): Check {
  return { id: `${trackId}-${day}`, pair_id: 'pair', track_id: trackId, day };
}

describe('scoreParticipant', () => {
  it('counts an unchecked habit as a miss', () => {
    expect(scoreParticipant([habit], [], 'alex', '2026-10-24')).toBe(-1);
  });

  it('counts a check as the gain and every other day as the loss', () => {
    expect(scoreParticipant([habit], [check('habit', '2026-10-25')], 'alex', '2026-10-26')).toBe(0);
  });

  it('ignores days before the item starts and the other person', () => {
    expect(scoreParticipant([habit], [], 'alex', '2026-10-23')).toBe(0);
    expect(scoreParticipant([habit], [], 'jordan', '2026-10-26')).toBe(0);
  });

  it('counts an unchecked vice as indulging', () => {
    expect(scoreParticipant([vice], [check('vice', '2026-10-24')], 'alex', '2026-10-25')).toBe(-1);
  });

  it('adds both lists together', () => {
    expect(scoreParticipant([habit, vice], [], 'alex', '2026-10-24')).toBe(-5);
  });

  it('skips days the item is not scheduled', () => {
    const mondays = { ...habit, weekdays: 2 };
    expect(scoreParticipant([mondays], [], 'alex', '2026-10-25')).toBe(0);
    expect(scoreParticipant([mondays], [], 'alex', '2026-10-26')).toBe(-1);
  });
});

describe('settledScore', () => {
  it('keeps today out of the overall total until the day changes', () => {
    const checks = [check('habit', '2026-10-26')];
    expect(pointsForDay([habit], checks, 'alex', '2026-10-26').score).toBe(2);
    expect(settledScore([habit], checks, 'alex', '2026-10-26')).toBe(-2);
    expect(scoreParticipant([habit], checks, 'alex', '2026-10-26')).toBe(0);
  });
});

describe('formatPoints', () => {
  it('uses a minus sign for a negative score', () => {
    expect(formatPoints(-3)).toBe('−3');
    expect(formatPoints(4)).toBe('4');
    expect(formatPoints(2.5)).toBe('2.5');
    expect(formatPoints(-1.26)).toBe('−1.3');
  });

  it('marks a daily gain with a plus', () => {
    expect(formatChange(3)).toBe('+3');
    expect(formatChange(-2)).toBe('−2');
    expect(formatChange(0)).toBe('0');
  });
});

describe('capped scoring', () => {
  it('makes a perfect day worth the daily maximum for a short list and a long one', () => {
    const short = [habit, vice];
    const long = Array.from({ length: 25 }, (_, index) => ({
      ...habit,
      id: `item-${index}`,
      gain: 1,
      loss: 1,
    }));
    const shortChecks = short.map((track) => check(track.id, '2026-10-24'));
    const longChecks = long.map((track) => check(track.id, '2026-10-24'));
    const capped = { mode: 'capped' as const, dailyMax: 10 };
    expect(scoreParticipant(short, shortChecks, 'alex', '2026-10-24', capped)).toBeCloseTo(10);
    expect(scoreParticipant(long, longChecks, 'alex', '2026-10-24', capped)).toBeCloseTo(10);
  });

  it('gives each item a share of the daily maximum', () => {
    const capped = { mode: 'capped' as const, dailyMax: 10 };
    const day = scoreParticipant([habit, vice], [check('habit', '2026-10-24')], 'alex', '2026-10-24', capped);
    expect(day).toBeCloseTo((2 - 4) * (10 / 5));
  });
});
