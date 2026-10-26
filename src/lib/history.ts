import type { Check, Track } from '../types';
import { daysFrom } from './dates';

export type DayScore = {
  day: string;
  score: number;
  maxGain: number;
  maxLoss: number;
};

export type HistoryKind = 'empty' | 'flat' | 'kept' | 'lost';

export function scoreDay(tracks: Track[], checks: Check[], ownerId: string, day: string): DayScore {
  const checked = new Set(checks.filter((check) => check.day === day).map((check) => check.track_id));
  let score = 0;
  let maxGain = 0;
  let maxLoss = 0;
  for (const track of tracks) {
    if (track.owner_id !== ownerId || track.starts_on > day) continue;
    maxGain += track.gain;
    maxLoss += track.loss;
    score += checked.has(track.id) ? track.gain : -track.loss;
  }
  return { day, score, maxGain, maxLoss };
}

export function historyKind(day: DayScore): HistoryKind {
  if (day.maxGain === 0 && day.maxLoss === 0) return 'empty';
  if (day.score > 0) return 'kept';
  if (day.score < 0) return 'lost';
  return 'flat';
}

/** 1 is every point kept, or every point lost. 0 is an even day. */
export function historyLevel(day: DayScore): number {
  const kind = historyKind(day);
  if (kind === 'kept') return day.maxGain === 0 ? 0 : day.score / day.maxGain;
  if (kind === 'lost') return day.maxLoss === 0 ? 0 : Math.abs(day.score) / day.maxLoss;
  return 0;
}

export function historyPhrase(day: DayScore): string {
  const kind = historyKind(day);
  if (kind === 'empty') return 'No items';
  if (kind === 'kept') return `Kept ${day.score} of ${day.maxGain}`;
  if (kind === 'lost') return `Lost ${Math.abs(day.score)} of ${day.maxLoss}`;
  return 'Even';
}

export function personHistory(tracks: Track[], checks: Check[], ownerId: string, today: string): DayScore[] {
  const started = tracks.filter((track) => track.owner_id === ownerId && track.starts_on <= today);
  if (started.length === 0) return [];
  const start = started.reduce((earliest, track) => (track.starts_on < earliest ? track.starts_on : earliest), started[0].starts_on);
  return daysFrom(start, today).map((day) => scoreDay(tracks, checks, ownerId, day));
}

function weekdayIndex(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function historyWeeks(start: string, end: string): (string | null)[][] {
  if (start > end) return [];
  const cells: (string | null)[] = Array.from({ length: weekdayIndex(start) }, () => null);
  for (const day of daysFrom(start, end)) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

export function monthName(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function monthLabels(weeks: (string | null)[][]): string[] {
  let previous = '';
  return weeks.map((week, index) => {
    const days = week.filter((day): day is string => day !== null);
    if (days.length === 0) return '';
    const marker = days.find((day) => day.endsWith('-01')) ?? (index === 0 ? days[0] : null);
    if (!marker) return '';
    const label = monthName(marker);
    if (label === previous) return '';
    previous = label;
    return label;
  });
}
