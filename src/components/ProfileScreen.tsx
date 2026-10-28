import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  deleteAccount,
  ensureProfile,
  fetchOwned,
  friendRequests,
  friendSuggestions,
  messageFrom,
  requestFriend,
  respondFriend,
  updateProfile,
} from '../lib/api';
import { todayKey } from '../lib/dates';
import { combinedHistory } from '../lib/history';
import { scoringFrom } from '../lib/score';
import type { FriendCard, FriendRequest, Membership } from '../types';
import { ActivityLog } from './ActivityLog';

type Props = {
  memberships: Membership[];
  onSignOut: () => void;
  onAccountDeleted: () => void;
};

export function ProfileScreen({ memberships, onSignOut, onAccountDeleted }: Props) {
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [suggestions, setSuggestions] = useState<FriendCard[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [days, setDays] = useState<ReturnType<typeof combinedHistory>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timeZone = memberships[0]?.pair.timezone ?? 'UTC';

  async function loadFriends() {
    const [nextSuggestions, nextRequests] = await Promise.all([friendSuggestions(), friendRequests()]);
    setSuggestions(nextSuggestions);
    setRequests(nextRequests.filter((request) => request.status === 'pending'));
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await ensureProfile();
        if (cancelled) return;
        if (profile) {
          setName(profile.display_name);
          setSavedName(profile.display_name);
        }
      } catch (err) {
        if (!cancelled) setError(messageFrom(err));
      }
      try {
        if (!cancelled) await loadFriends();
      } catch (err) {
        if (!cancelled) setError(messageFrom(err));
      }
      try {
        const owned = await fetchOwned(memberships.map((membership) => membership.pair.id));
        if (cancelled) return;
        const today = memberships.reduce((latest, membership) => {
          const key = todayKey(membership.pair.timezone);
          return key > latest ? key : latest;
        }, '0000-01-01');
        setDays(
          combinedHistory(
            memberships.map((membership) => ({
              ownerId: membership.participant.id,
              tracks: owned.tracks.filter((track) => track.pair_id === membership.pair.id),
              checks: owned.checks.filter((check) => check.pair_id === membership.pair.id),
              scoring: scoringFrom(membership.pair),
            })),
            today,
          ),
        );
      } catch (err) {
        if (!cancelled) setError(messageFrom(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberships]);

  const incoming = useMemo(() => requests.filter((request) => request.direction === 'incoming'), [requests]);
  const outgoing = useMemo(() => requests.filter((request) => request.direction === 'outgoing'), [requests]);

  async function saveName(event: FormEvent) {
    event.preventDefault();
    const clean = name.trim();
    if (clean === savedName) return;
    setBusy(true);
    setError(null);
    try {
      await updateProfile(clean);
      setSavedName(clean);
      setName(clean);
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(false);
    }
  }

  async function addFriend(userId: string) {
    setBusy(true);
    setError(null);
    try {
      await requestFriend(userId);
      await loadFriends();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(false);
    }
  }

  async function answer(id: string, accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      await respondFriend(id, accept);
      await loadFriends();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      onAccountDeleted();
    } catch (err) {
      setError(messageFrom(err));
      setBusy(false);
    }
  }

  return (
    <main className="shell with-tabs">
      <header className="topbar">
        <h1 className="brand">Profile</h1>
      </header>
      <form onSubmit={(event) => void saveName(event)}>
        <label className="field">
          <span>Name friends see</span>
          <input value={name} maxLength={32} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="submit" className="button" disabled={busy || name.trim() === savedName}>
          Save name
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}

      <h2>Friends</h2>
      {suggestions.length === 0 && incoming.length === 0 && outgoing.length === 0 ? (
        <p className="empty">People you share a board with can be added here.</p>
      ) : null}
      {incoming.map((request) => (
        <div key={request.id} className="friend-row">
          <span className="track-name">{request.display_name}</span>
          <button type="button" className="button" disabled={busy} onClick={() => void answer(request.id, true)}>
            Accept
          </button>
          <button type="button" className="button" disabled={busy} onClick={() => void answer(request.id, false)}>
            Decline
          </button>
        </div>
      ))}
      {outgoing.map((request) => (
        <p key={request.id} className="track-meta">
          Waiting on {request.display_name}
        </p>
      ))}
      {suggestions.map((person) => (
        <div key={person.user_id} className="friend-row">
          <span className="track-name">{person.display_name}</span>
          <button type="button" className="button" disabled={busy} onClick={() => void addFriend(person.user_id)}>
            Add
          </button>
        </div>
      ))}

      <h2>Activity</h2>
      <ActivityLog days={days} timeZone={timeZone} />

      <button type="button" className="text-button" onClick={onSignOut}>
        Sign out
      </button>
      {confirmDelete ? (
        <button type="button" className="text-button danger-text" disabled={busy} onClick={() => void removeAccount()}>
          Delete account forever
        </button>
      ) : (
        <button type="button" className="text-button" onClick={() => setConfirmDelete(true)}>
          Delete account
        </button>
      )}
    </main>
  );
}
