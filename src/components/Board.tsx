import { useState } from 'react';
import { messageFrom, proposeTrack, respondToOffer } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useBoard } from '../lib/useBoard';
import { useDayColumn } from '../lib/useDayColumn';
import type { BoardData, Membership, Offer, Track } from '../types';
import { AddTrackModal, type TrackDraft } from './AddTrackModal';
import { OfferCard } from './OfferCard';
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
};

function myTurn(offer: Offer, meId: string) {
  if (offer.awaiting_id) return offer.awaiting_id === meId;
  return offer.proposer_id !== meId;
}

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

export function Board({ pairId, userId, memberships, onSelectBoard, onOpenBoard, onDeleted, onSignOut }: Props) {
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
  data: BoardData;
  reload: () => Promise<void>;
  setData: (value: BoardData | ((current: BoardData | null) => BoardData | null)) => void;
}) {
  const { day, phase } = useDayColumn(data.pair.timezone);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'counter'; offer: Offer }>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyTrackId, setBusyTrackId] = useState<string | null>(null);

  const me = data.participants.find((person) => person.user_id === userId);
  const others = data.participants.filter((person) => person.user_id !== userId);
  if (!me) {
    return (
      <main className="shell">
        <p className="error">This account is not on the board.</p>
      </main>
    );
  }

  const incoming = data.offers.filter((offer) => myTurn(offer, me.id));
  const waiting = data.offers.filter((offer) => !myTurn(offer, me.id));
  const visibleTracks = data.tracks.filter((track) => track.starts_on <= day);
  const myTracks = visibleTracks.filter((track) => track.owner_id === me.id);

  function nameFor(participantId: string) {
    return data.participants.find((person) => person.id === participantId)?.display_name ?? 'Them';
  }

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

  async function runOffer(work: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await work();
      setModal(null);
      await reload();
    } catch (error) {
      setActionError(messageFrom(error));
    } finally {
      setBusy(false);
    }
  }

  async function submitDraft(draft: TrackDraft) {
    if (!modal) return;
    if (modal.mode === 'create') {
      await runOffer(() => proposeTrack(data.pair.id, draft));
      return;
    }
    await runOffer(() =>
      respondToOffer(modal.offer.id, 'counter', { gain: draft.gain, loss: draft.loss }),
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <h1 className="brand">Habits</h1>
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

      {actionError ? <p className="error">{actionError}</p> : null}

      {incoming.length > 0 || waiting.length > 0 ? (
        <div className="offer-list">
          {incoming.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              waiting={false}
              busy={busy}
              title={
                offer.proposer_id === me.id
                  ? `${offer.countered_by ? nameFor(offer.countered_by) : 'Someone'} countered`
                  : `${nameFor(offer.proposer_id)} proposed`
              }
              onAccept={() => void runOffer(() => respondToOffer(offer.id, 'accept'))}
              onDecline={() => void runOffer(() => respondToOffer(offer.id, 'decline'))}
              onCounter={() => setModal({ mode: 'counter', offer })}
            />
          ))}
          {waiting.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              waiting
              busy={busy}
              title={offer.awaiting_id ? `Waiting on ${nameFor(offer.awaiting_id)}` : 'Waiting on the others'}
              onWithdraw={
                offer.proposer_id === me.id
                  ? () => void runOffer(() => respondToOffer(offer.id, 'withdraw'))
                  : undefined
              }
            />
          ))}
        </div>
      ) : null}

      <PersonPanel
        person={me}
        tracks={myTracks}
        checks={data.checks}
        allTracks={data.tracks}
        day={day}
        phase={phase}
        timeZone={data.pair.timezone}
        goal={data.pair.goal}
        editable
        busyTrackId={busyTrackId}
        onToggle={(track, checked) => void toggle(track, checked)}
        onAdd={() => setModal({ mode: 'create' })}
        addDisabled={others.length === 0}
      />
      {others.length === 0 ? (
        <p className="help">Someone else has to join before you can add something.</p>
      ) : null}

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
            editable={false}
            busyTrackId={null}
            onToggle={() => undefined}
          />
        ))
      )}

      {modal ? (
        <AddTrackModal
          mode={modal.mode}
          initial={
            modal.mode === 'counter'
              ? { name: modal.offer.name, kind: modal.offer.kind, gain: modal.offer.gain, loss: modal.offer.loss }
              : { name: '', kind: 'habit', gain: 1, loss: 1 }
          }
          busy={busy}
          error={actionError}
          onClose={() => {
            if (!busy) setModal(null);
          }}
          onSubmit={(draft) => void submitDraft(draft)}
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
