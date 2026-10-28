import { useEffect, useState } from 'react';
import { fetchOwned, messageFrom } from '../lib/api';
import { todayKey } from '../lib/dates';
import { formatPoints, scoringFrom, settledScore } from '../lib/score';
import type { Membership } from '../types';

type Props = {
  memberships: Membership[];
  onOpen: (pairId: string) => void;
  onCreate: () => void;
};

export function BoardsHome({ memberships, onOpen, onCreate }: Props) {
  const [lines, setLines] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchOwned(memberships.map((membership) => membership.pair.id))
      .then(({ tracks, checks }) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const membership of memberships) {
          const today = todayKey(membership.pair.timezone);
          const score = settledScore(
            tracks.filter((track) => track.pair_id === membership.pair.id),
            checks.filter((check) => check.pair_id === membership.pair.id),
            membership.participant.id,
            today,
            scoringFrom(membership.pair),
          );
          next[membership.pair.id] = `${formatPoints(score)} / ${membership.pair.goal}`;
        }
        setLines(next);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(messageFrom(err));
      });
    return () => {
      cancelled = true;
    };
  }, [memberships]);

  return (
    <main className="shell with-tabs">
      <header className="topbar">
        <h1 className="brand">Boards</h1>
      </header>
      {error ? <p className="error">{error}</p> : null}
      <div className="board-list">
        {memberships.map((membership) => (
          <button key={membership.pair.id} type="button" className="board-card" onClick={() => onOpen(membership.pair.id)}>
            <span className="track-name">{membership.pair.title || 'Board'}</span>
            <span className="track-meta">
              {membership.pair.prize?.trim() ? membership.pair.prize : 'No prize'}
              {lines[membership.pair.id] ? ` · ${lines[membership.pair.id]}` : ''}
            </span>
          </button>
        ))}
      </div>
      <button type="button" className="text-button" onClick={onCreate}>
        Create or join a board
      </button>
    </main>
  );
}
