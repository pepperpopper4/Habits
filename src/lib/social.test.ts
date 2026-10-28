import { describe, expect, it } from 'vitest';
import { feedPhrase, feedWhen, rankStandings } from './social';

describe('rankStandings', () => {
  it('ranks people with public habits and parks the rest', () => {
    const ranked = rankStandings([
      { user_id: 'a', display_name: 'Ada', kept: 1, scheduled: 2 },
      { user_id: 'b', display_name: 'Bea', kept: 2, scheduled: 2 },
      { user_id: 'c', display_name: 'Cal', kept: 2, scheduled: 3 },
      { user_id: 'd', display_name: 'Dee', kept: 0, scheduled: 0 },
    ]);
    expect(ranked.map((row) => [row.display_name, row.rank])).toEqual([
      ['Cal', 1],
      ['Bea', 1],
      ['Ada', 3],
      ['Dee', null],
    ]);
  });
});

describe('feedPhrase', () => {
  it('says kept for a habit and avoided for a vice', () => {
    expect(feedPhrase('habit', 'Meditate')).toBe('kept Meditate');
    expect(feedPhrase('vice', 'Soda')).toBe('avoided Soda');
  });
});

describe('feedWhen', () => {
  it('uses a short age', () => {
    const now = new Date('2026-10-27T15:00:00.000Z');
    expect(feedWhen('2026-10-27T14:00:00.000Z', now)).toBe('1h');
    expect(feedWhen('2026-10-27T14:59:40.000Z', now)).toBe('Just now');
  });
});
