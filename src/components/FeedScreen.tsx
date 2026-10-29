import { useEffect, useState } from 'react';
import { friendFeed, messageFrom } from '../lib/api';
import { feedPhrase, feedWhen } from '../lib/social';
import type { FeedItem } from '../types';

export function FeedScreen() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void friendFeed()
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(messageFrom(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="shell with-tabs">
      <header className="topbar">
        <h1 className="brand">feed</h1>
      </header>
      {error ? <p className="error">{error}</p> : null}
      {items && items.length === 0 ? <p className="empty">When a friend checks a public habit, it shows up here.</p> : null}
      <div className="feed-list">
        {(items ?? []).map((item) => (
          <article key={item.check_id} className="feed-row">
            <p className="feed-line">
              <span className="track-name">{item.actor_name}</span> {feedPhrase(item.kind, item.habit_name)}
            </p>
            <p className="track-meta">{item.checked_at ? feedWhen(item.checked_at) : item.day}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
