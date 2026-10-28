import type { Kind, Standing } from '../types';

export type RankedStanding = Standing & { rank: number | null };

export function rankStandings(rows: Standing[]): RankedStanding[] {
  const playing = rows
    .filter((row) => row.scheduled > 0)
    .sort((a, b) => b.kept - a.kept || b.scheduled - a.scheduled || a.display_name.localeCompare(b.display_name));
  const quiet = rows
    .filter((row) => row.scheduled === 0)
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
  let rank = 0;
  let previousKept = Number.NaN;
  const placed = playing.map((row, index) => {
    if (row.kept !== previousKept) {
      rank = index + 1;
      previousKept = row.kept;
    }
    return { ...row, rank };
  });
  return [...placed, ...quiet.map((row) => ({ ...row, rank: null }))];
}

export function feedPhrase(kind: Kind, name: string): string {
  return kind === 'vice' ? `avoided ${name}` : `kept ${name}`;
}

export function feedWhen(iso: string, now = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.max(0, Math.round((now.getTime() - then) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}
