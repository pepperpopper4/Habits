import { useState } from 'react';
import { addTrack, messageFrom, nudgeTrack, updateTrack } from '../lib/api';
import { scoringFrom, showsOn } from '../lib/score';
import { supabase } from '../lib/supabase';
import { useBoard } from '../lib/useBoard';
import { useDayColumn } from '../lib/useDayColumn';
import type { BoardData, Membership, Track } from '../types';
import { AddTrackModal, type TrackDraft } from './AddTrackModal';
import { PersonPanel } from './PersonPanel';
import { SettingsSheet } from './SettingsSheet';

type Props = {
  pairId: string;
  userId: string;
  memberships: Membership[];
  onSelectBoard: (pairId: string) => void;
  onOpenBoard: (pairId: string) => void;
  onDeleted: (pairId: string) => void;
  onSignOut: () => void;
  onBack?: () => void;
};

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.4v2.1M12 18.5v2.1M3.4 12h2.1M18.5 12h2.1M6.1 6.1l1.5 1.5M16.4 16.4l1.5 1.5M17.9 6.1l-1.5 1.5M7.6 16.4l-1.5 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Board({ pairId, userId, memberships, onSelectBoard, onOpenBoard, onDeleted, onSignOut, onBack }: Props) {
  const board = useBoard(pairId);
  if (board.loading && !board.data) {
    return (
      <main className="shell">
        <p className="loading">Loading…</p>
      </main>
    );
  }
  if (!board.data) {
    return (
      <main className="shell">
        <p className="error">{board.error ?? 'Could not load the board.'}</p>
      </main>
    );
  }
  return (
    <BoardReady
      userId={userId}
      memberships={memberships}
      onSelectBoard={onSelectBoard}
      onOpenBoard={onOpenBoard}
      onDeleted={onDeleted}
      onSignOut={onSignOut}
      onBack={onBack}
      data={board.data}
      reload={board.reload}
      setData={board.setData}
    />
  );
}

function BoardReady({
  userId,
  memberships,
  onSelectBoard,
  onOpenBoard,
  onDeleted,
  onSignOut,
  onBack,
  data,
  reload,
  setData,
}: {
  userId: string;
  memberships: Membership[];
  onSelectBoard: (pairId: string) => void;
  onOpenBoard: (pairId: string) => void;
  onDeleted: (pairId: string) => void;
  onSignOut: () => void;
  onBack?: () => void;
  data: BoardData;
  reload: () => Promise<void>;
  setData: (value: BoardData | ((current: BoardData | null) => BoardData | null)) => void;
}) {
  const { day, phase } = useDayColumn(data.pair.timezone);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Track | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyTrackId, setBusyTrackId] = useState<string | null>(null);
  const scoring = scoringFrom(data.pair);

  const me = data.participants.find((person) => person.user_id === userId);
  const others = data.participants.filter((person) => person.user_id !== userId);
  if (!me) {
    return (
      <main className="shell">
        <p className="error">This account is not on the board.</p>
      </main>
    );
  }

  const namesByUser = new Map(data.participants.map((person) => [person.user_id, person.display_name]));
  const visibleTracks = data.tracks.filter((track) => showsOn(track, day));
  const myTracks = visibleTracks.filter((track) => track.owner_id === me.id);

  async function toggle(track: Track, checked: boolean) {
    setActionError(null);
    setBusyTrackId(track.id);
    setData((current) => {
      if (!current) return current;
      const checks = checked
        ? current.checks.filter((check) => !(check.track_id === track.id && check.day === day))
        : [
            ...current.checks,
            { id: `pending-${track.id}-${day}`, pair_id: track.pair_id, track_id: track.id, day },
          ];
      return { ...current, checks };
    });

    const result = checked
      ? await supabase.from('checks').delete().eq('pair_id', track.pair_id).eq('track_id', track.id).eq('day', day).select('id')
      : await supabase.from('checks').insert({ pair_id: track.pair_id, track_id: track.id, day });

    if (result.error) setActionError(messageFrom(result.error));
    else if (checked && (result.data?.length ?? 0) === 0) setActionError('That day is locked.');
    await reload();
    setBusyTrackId(null);
  }

  async function nudge(track: Track) {
    setActionError(null);
    setBusyTrackId(track.id);
    try {
      await nudgeTrack(track.id);
      await reload();
    } catch (error) {
      setActionError(messageFrom(error));
    } finally {
      setBusyTrackId(null);
    }
  }

  async function submitDraft(draft: TrackDraft) {
    setBusy(true);
    setActionError(null);
    try {
      await addTrack(data.pair.id, draft);
      setAdding(false);
      await reload();
    } catch (error) {
      setActionError(messageFrom(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(draft: TrackDraft) {
    if (!editing) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateTrack(editing.id, draft);
      setEditing(null);
      await reload();
    } catch (error) {
      setActionError(messageFrom(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell with-tabs">
      <header className="topbar">
        {onBack ? (
          <button type="button" className="text-button" onClick={onBack}>
            Boards
          </button>
        ) : (
          <h1 className="brand">Habits</h1>
        )}
        <div className="topbar-actions">
          {memberships.length > 1 ? (
            <label className="board-picker">
              <span className="sr-only">Board</span>
              <select
                aria-label="Board"
                value={data.pair.id}
                onChange={(event) => onSelectBoard(event.target.value)}
              >
                {memberships.map((membership) => (
                  <option key={membership.pair.id} value={membership.pair.id}>
                    {membership.pair.title || 'Board'}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="board-title">{data.pair.title || 'Board'}</p>
          )}
          <button type="button" className="icon-button" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
            <GearIcon />
          </button>
        </div>
      </header>

      {data.pair.prize?.trim() ? (
        <p className="prize">
          <span className="prize-label">Prize</span>
          {data.pair.prize}
        </p>
      ) : null}

      {actionError ? <p className="error">{actionError}</p> : null}

      <PersonPanel
        person={me}
        tracks={myTracks}
        checks={data.checks}
        allTracks={data.tracks}
        day={day}
        phase={phase}
        timeZone={data.pair.timezone}
        goal={data.pair.goal}
        scoring={scoring}
        editable
        busyTrackId={busyTrackId}
        onToggle={(track, checked) => void toggle(track, checked)}
        onAdd={() => {
          setActionError(null);
          setAdding(true);
        }}
        onEdit={(track) => {
          setActionError(null);
          setEditing(track);
        }}
        nudges={data.nudges}
        namesByUser={namesByUser}
        viewerUserId={userId}
      />

      {others.length === 0 ? (
        <section className="panel" aria-label="Waiting for someone to join">
          <h2>Other people</h2>
          <p className="empty">Share this code so they can join.</p>
          <p className="code">{data.pair.invite_code}</p>
        </section>
      ) : (
        others.map((person) => (
          <PersonPanel
            key={person.id}
            person={person}
            tracks={visibleTracks.filter((track) => track.owner_id === person.id)}
            checks={data.checks}
            allTracks={data.tracks}
            day={day}
            phase={phase}
            timeZone={data.pair.timezone}
          goal={data.pair.goal}
          scoring={scoring}
          editable={false}
            busyTrackId={busyTrackId}
            onToggle={() => undefined}
            nudges={data.nudges}
            namesByUser={namesByUser}
            viewerUserId={userId}
            onNudge={(track) => void nudge(track)}
          />
        ))
      )}

      {adding ? (
        <AddTrackModal
          mode="create"
          initial={{ name: '', kind: 'habit', gain: 1, loss: 1, weekdays: 127, visibility: 'private' }}
          busy={busy}
          error={actionError}
          onClose={() => {
            if (!busy) setAdding(false);
          }}
          onSubmit={(draft) => void submitDraft(draft)}
        />
      ) : null}

      {editing ? (
        <AddTrackModal
          mode="edit"
          initial={{
            name: editing.name,
            kind: editing.kind,
            gain: editing.gain,
            loss: editing.loss,
            weekdays: editing.weekdays || 127,
            visibility: editing.visibility === 'public' ? 'public' : 'private',
          }}
          busy={busy}
          error={actionError}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
          onSubmit={(draft) => void saveEdit(draft)}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsSheet
          pair={data.pair}
          participants={data.participants}
          memberships={memberships}
          userId={userId}
          isCreator={me.seat === 1}
          onClose={() => setSettingsOpen(false)}
          onSignOut={onSignOut}
          onSelectBoard={(id) => {
            setSettingsOpen(false);
            onSelectBoard(id);
          }}
          onOpenBoard={(id) => {
            setSettingsOpen(false);
            onOpenBoard(id);
          }}
          onDeleted={() => {
            setSettingsOpen(false);
            onDeleted(data.pair.id);
          }}
          onUpdate={async (patch) => {
            const { error } = await supabase.from('pairs').update(patch).eq('id', data.pair.id);
            if (error) throw error;
            await reload();
          }}
        />
      ) : null}
    </main>
  );
}
