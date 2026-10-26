import { describe, expect, it } from 'vitest';
import type { Check, Track } from '../types';
import { formatPoints, scoreParticipant } from './score';

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
});

describe('formatPoints', () => {
  it('uses a minus sign for a negative score', () => {
    expect(formatPoints(-3)).toBe('−3');
    expect(formatPoints(4)).toBe('4');
  });
});
