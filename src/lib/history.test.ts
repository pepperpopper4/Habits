import { describe, expect, it } from 'vitest';
import type { Check, Track } from '../types';
import { historyKind, historyLevel, historyPhrase, historyWeeks, monthLabels, monthName, personHistory, scoreDay } from './history';

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
  created_at: '2026-10-24T00:00:00.000Z',
};

const vice: Track = {
  ...habit,
  id: 'vice',
  name: 'Soda',
  kind: 'vice',
  gain: 2,
  loss: 4,
};

function check(trackId: string, day: string): Check {
  return { id: `${trackId}-${day}`, pair_id: 'pair', track_id: trackId, day };
}

describe('scoreDay', () => {
  it('treats a fully checked day as every point kept', () => {
    const day = scoreDay([habit, vice], [check('habit', '2026-10-24'), check('vice', '2026-10-24')], 'alex', '2026-10-24');
    expect(day.score).toBe(4);
    expect(historyKind(day)).toBe('kept');
    expect(historyLevel(day)).toBe(1);
    expect(historyPhrase(day)).toBe('Kept 4 of 4');
  });

  it('keeps a lighter green when the day is positive but incomplete', () => {
    const other: Track = { ...habit, id: 'other', gain: 2, loss: 1 };
    const day = scoreDay([habit, other], [check('habit', '2026-10-24')], 'alex', '2026-10-24');
    expect(day.score).toBe(1);
    expect(historyKind(day)).toBe('kept');
    expect(historyLevel(day)).toBe(0.25);
  });

  it('is white when the day nets to zero', () => {
    const day = scoreDay([habit], [], 'alex', '2026-10-23');
    expect(historyKind(day)).toBe('empty');
    const even = scoreDay([{ ...habit, gain: 1, loss: 1 }, { ...vice, gain: 1, loss: 1 }], [check('habit', '2026-10-24')], 'alex', '2026-10-24');
    expect(even.score).toBe(0);
    expect(historyKind(even)).toBe('flat');
    expect(historyLevel(even)).toBe(0);
    expect(historyPhrase(even)).toBe('Even');
  });

  it('turns red in proportion to the points lost', () => {
    const day = scoreDay([habit, vice], [check('habit', '2026-10-24')], 'alex', '2026-10-24');
    expect(day.score).toBe(-2);
    expect(historyKind(day)).toBe('lost');
    expect(historyLevel(day)).toBeCloseTo(2 / 5);
    expect(historyPhrase(day)).toBe('Lost 2 of 5');
  });

  it('starts history on the first active day', () => {
    const days = personHistory([habit], [], 'alex', '2026-10-26');
    expect(days.map((day) => day.day)).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
  });
});

describe('historyWeeks', () => {
  it('lines days up with Sunday and labels the month', () => {
    const weeks = historyWeeks('2026-10-25', '2026-11-01');
    expect(weeks[0][0]).toBe('2026-10-25');
    expect(weeks.at(-1)?.[0]).toBe('2026-11-01');
    const labels = monthLabels(weeks);
    expect(labels[0]).toBe(monthName('2026-10-25'));
    expect(labels).toContain(monthName('2026-11-01'));
  });
});
