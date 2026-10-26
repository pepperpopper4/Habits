import type { Check, Track } from '../types';
import { daysFrom } from './dates';

export function scoreParticipant(tracks: Track[], checks: Check[], ownerId: string, today: string): number {
  const checked = new Set(checks.map((check) => `${check.track_id}:${check.day}`));
  let total = 0;
  for (const track of tracks) {
    if (track.owner_id !== ownerId) continue;
    for (const day of daysFrom(track.starts_on, today)) {
      total += checked.has(`${track.id}:${day}`) ? track.gain : -track.loss;
    }
  }
  return total;
}

export function formatPoints(value: number): string {
  if (value < 0) return `−${Math.abs(value)}`;
  return String(value);
}
