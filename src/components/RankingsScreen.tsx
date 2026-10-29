import { useEffect, useState } from 'react';
import { friendRankings, messageFrom } from '../lib/api';
import { rankStandings } from '../lib/social';
import type { Standing } from '../types';

type Props = {
  userId: string;
};

export function RankingsScreen({ userId }: Props) {
  const [rows, setRows] = useState<Standing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void friendRankings()
      .then((next) => {
        if (cancelled) return;
        setRows(next);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(messageFrom(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ranked = rows ? rankStandings(rows) : [];

  return (
    <main className="shell with-tabs">
      <header className="topbar">
        <h1 className="brand">rankings</h1>
      </header>
      <p className="help">Today's public habits, among friends.</p>
      {error ? <p className="error">{error}</p> : null}
      <ol className="rank-list">
        {ranked.map((row) => (
          <li key={row.user_id} className={row.user_id === userId ? 'rank-row mine' : 'rank-row'}>
            <span className="rank-place">{row.rank ?? '–'}</span>
            <span className="track-name">{row.user_id === userId ? 'You' : row.display_name}</span>
            <span className="track-meta">{row.scheduled > 0 ? `${row.kept} of ${row.scheduled}` : 'no public habits'}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
