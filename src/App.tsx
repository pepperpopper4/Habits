import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthScreen, PairScreen, SetupScreen } from './components/AuthScreen';
import { Board } from './components/Board';
import { BoardsHome } from './components/BoardsHome';
import { FeedScreen } from './components/FeedScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { RankingsScreen } from './components/RankingsScreen';
import { TabBar, type Tab } from './components/TabBar';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import type { Membership, Pair, Participant } from './types';

function storageKey(userId: string) {
  return `habits-board:${userId}`;
}

function readStoredBoard(userId: string) {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

function rememberBoard(userId: string, pairId: string | null) {
  try {
    if (pairId) localStorage.setItem(storageKey(userId), pairId);
    else localStorage.removeItem(storageKey(userId));
  } catch {
    // The board still switches for this visit.
  }
}

function membershipsFrom(rows: unknown): Membership[] {
  if (!Array.isArray(rows)) return [];
  const memberships: Membership[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Participant & { pairs?: Pair | Pair[] | null };
    const pair = Array.isArray(record.pairs) ? record.pairs[0] : record.pairs;
    if (!pair || typeof pair !== 'object') continue;
    const participant: Participant = {
      id: record.id,
      pair_id: record.pair_id,
      user_id: record.user_id,
      display_name: record.display_name,
      seat: record.seat,
    };
    memberships.push({ participant, pair });
  }
  return memberships;
}

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [memberships, setMemberships] = useState<Membership[] | undefined>(undefined);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileVersion, setProfileVersion] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setMemberships(session === undefined ? undefined : []);
      setBoardId(null);
      return;
    }
    const userId = session.user.id;
    let cancelled = false;
    setProfileError(null);
    void supabase
      .from('participants')
      .select('*, pairs(*)')
      .eq('user_id', userId)
      .order('seat')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setMemberships([]);
          setBoardId(null);
          setProfileError(error.message);
          return;
        }
        const next = membershipsFrom(data);
        setMemberships(next);
        setBoardId((current) => {
          const preferred = current ?? readStoredBoard(userId);
          const chosen = next.find((membership) => membership.pair.id === preferred)?.pair.id ?? next[0]?.pair.id ?? null;
          rememberBoard(userId, chosen);
          return chosen;
        });
      });
    return () => {
      cancelled = true;
    };
  }, [session, profileVersion]);

  function selectBoard(pairId: string) {
    if (!session) return;
    rememberBoard(session.user.id, pairId);
    setBoardId(pairId);
  }

  function openBoard(pairId: string) {
    selectBoard(pairId);
    setProfileVersion((value) => value + 1);
  }

  function leaveBoard(pairId: string) {
    if (!session) return;
    setMemberships((current) => {
      const next = (current ?? []).filter((membership) => membership.pair.id !== pairId);
      const chosen = next[0]?.pair.id ?? null;
      rememberBoard(session.user.id, chosen);
      setBoardId(chosen);
      return next;
    });
    setProfileVersion((value) => value + 1);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (!isSupabaseConfigured) return <SetupScreen />;
  if (session === undefined || (session && memberships === undefined)) {
    return (
      <main className="shell">
        <p className="loading">Loading…</p>
      </main>
    );
  }
  if (!session) return <AuthScreen onSignedIn={() => setProfileVersion((value) => value + 1)} />;
  return (
    <SignedIn
      userId={session.user.id}
      memberships={memberships ?? []}
      boardId={boardId}
      profileError={profileError}
      onSelectBoard={selectBoard}
      onOpenBoard={openBoard}
      onDeleted={leaveBoard}
      onSignOut={() => void signOut()}
      onRetry={() => setProfileVersion((value) => value + 1)}
    />
  );
}

function SignedIn({
  userId,
  memberships,
  boardId,
  profileError,
  onSelectBoard,
  onOpenBoard,
  onDeleted,
  onSignOut,
  onRetry,
}: {
  userId: string;
  memberships: Membership[];
  boardId: string | null;
  profileError: string | null;
  onSelectBoard: (pairId: string) => void;
  onOpenBoard: (pairId: string) => void;
  onDeleted: (pairId: string) => void;
  onSignOut: () => void;
  onRetry: () => void;
}) {
  const [tab, setTab] = useState<Tab>('boards');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const active = memberships.find((membership) => membership.pair.id === boardId) ?? null;

  return (
    <>
      {tab === 'boards' && profileError ? (
        <main className="shell with-tabs">
          <p className="error">{profileError}</p>
          <button type="button" className="button" onClick={onRetry}>
            Try again
          </button>
        </main>
      ) : null}
      {tab === 'boards' && !profileError && creating ? (
        <PairScreen
          onCancel={memberships.length > 0 ? () => setCreating(false) : undefined}
          onJoined={(pairId) => {
            onOpenBoard(pairId);
            setCreating(false);
            setOpen(true);
          }}
          onSignOut={onSignOut}
        />
      ) : null}
      {tab === 'boards' && !profileError && !creating && (!open || !active) ? (
        memberships.length === 0 ? (
          <PairScreen
            onJoined={(pairId) => {
              onOpenBoard(pairId);
              setOpen(true);
            }}
            onSignOut={onSignOut}
          />
        ) : (
          <BoardsHome
            memberships={memberships}
            onOpen={(pairId) => {
              onSelectBoard(pairId);
              setOpen(true);
            }}
            onCreate={() => setCreating(true)}
          />
        )
      ) : null}
      {tab === 'boards' && !profileError && !creating && open && active ? (
        <Board
          key={active.pair.id}
          pairId={active.pair.id}
          userId={userId}
          memberships={memberships}
          onSelectBoard={onSelectBoard}
          onOpenBoard={onOpenBoard}
          onDeleted={(pairId) => {
            onDeleted(pairId);
            setOpen(false);
          }}
          onSignOut={onSignOut}
          onBack={() => setOpen(false)}
        />
      ) : null}
      {tab === 'feed' ? <FeedScreen /> : null}
      {tab === 'rankings' ? <RankingsScreen userId={userId} /> : null}
      {tab === 'profile' ? (
        <ProfileScreen memberships={memberships} onSignOut={onSignOut} onAccountDeleted={onSignOut} />
      ) : null}
      <TabBar tab={tab} onChange={setTab} />
    </>
  );
}
