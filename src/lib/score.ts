import type { Check, ScoringMode, Track } from '../types';
import { daysFrom, isScheduled } from './dates';

export type { ScoringMode };

export type Scoring = {
  mode: ScoringMode;
  dailyMax: number;
};

export const rawScoring: Scoring = { mode: 'raw', dailyMax: 10 };

export function scoringFrom(pair: { scoring?: string | null; daily_max?: number | null }): Scoring {
  const dailyMax = pair.daily_max && pair.daily_max > 0 ? pair.daily_max : 10;
  return { mode: pair.scoring === 'capped' ? 'capped' : 'raw', dailyMax };
}

export type DayPoints = {
  score: number;
  maxGain: number;
  maxLoss: number;
};

export function showsOn(track: Track, day: string): boolean {
  return track.starts_on <= day && isScheduled(track.weekdays, day);
}

function activeTracks(tracks: Track[], ownerId: string, day: string): Track[] {
  return tracks.filter((track) => track.owner_id === ownerId && showsOn(track, day));
}

export function pointsForDay(
  tracks: Track[],
  checks: Check[],
  ownerId: string,
  day: string,
  scoring: Scoring = rawScoring,
): DayPoints {
  const active = activeTracks(tracks, ownerId, day);
  if (active.length === 0) return { score: 0, maxGain: 0, maxLoss: 0 };
  const checked = new Set(checks.filter((check) => check.day === day).map((check) => check.track_id));
  let score = 0;
  let maxGain = 0;
  let maxLoss = 0;
  for (const track of active) {
    maxGain += track.gain;
    maxLoss += track.loss;
    score += checked.has(track.id) ? track.gain : -track.loss;
  }
  if (scoring.mode !== 'capped' || maxGain <= 0) return { score, maxGain, maxLoss };
  const scale = scoring.dailyMax / maxGain;
  return { score: score * scale, maxGain: scoring.dailyMax, maxLoss: maxLoss * scale };
}

export function trackShare(track: Track, tracks: Track[], day: string, scoring: Scoring = rawScoring): { gain: number; loss: number } {
  if (scoring.mode !== 'capped') return { gain: track.gain, loss: track.loss };
  const active = activeTracks(tracks, track.owner_id, day);
  const maxGain = active.reduce((sum, item) => sum + item.gain, 0);
  if (maxGain <= 0) return { gain: 0, loss: 0 };
  const scale = scoring.dailyMax / maxGain;
  return { gain: track.gain * scale, loss: track.loss * scale };
}

export function settledScore(
  tracks: Track[],
  checks: Check[],
  ownerId: string,
  today: string,
  scoring: Scoring = rawScoring,
): number {
  return scoreParticipant(tracks, checks, ownerId, today, scoring) - pointsForDay(tracks, checks, ownerId, today, scoring).score;
}

export function formatChange(value: number): string {
  const text = formatPoints(value);
  if (text === '0') return text;
  if (text.startsWith('−')) return text;
  return `+${text}`;
}

export function scoreParticipant(
  tracks: Track[],
  checks: Check[],
  ownerId: string,
  today: string,
  scoring: Scoring = rawScoring,
): number {
  const started = tracks.filter((track) => track.owner_id === ownerId && track.starts_on <= today);
  if (started.length === 0) return 0;
  const start = started.reduce((earliest, track) => (track.starts_on < earliest ? track.starts_on : earliest), started[0].starts_on);
  let total = 0;
  for (const day of daysFrom(start, today)) {
    total += pointsForDay(tracks, checks, ownerId, day, scoring).score;
  }
  return total;
}

export function formatPoints(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return '0';
  const text = Number.isInteger(rounded) ? String(Math.abs(rounded)) : Math.abs(rounded).toFixed(1);
  if (rounded < 0) return `−${text}`;
  return text;
}
