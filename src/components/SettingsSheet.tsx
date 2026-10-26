import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPair, deletePair, joinPair, messageFrom } from '../lib/api';
import type { Membership, Pair, Participant, ScoringMode } from '../types';

const CODE_ALPHABET = /[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;

type PairPatch = {
  goal?: number;
  notes?: string;
  timezone?: string;
  title?: string;
  scoring?: ScoringMode;
  daily_max?: number;
  prize?: string;
};

type Props = {
  pair: Pair;
  participants: Participant[];
  memberships: Membership[];
  userId: string;
  isCreator: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onSelectBoard: (pairId: string) => void;
  onOpenBoard: (pairId: string) => void;
  onDeleted: () => void;
  onUpdate: (patch: PairPatch) => Promise<void>;
};

export function SettingsSheet({
  pair,
  participants,
  memberships,
  userId,
  isCreator,
  onClose,
  onSignOut,
  onSelectBoard,
  onOpenBoard,
  onDeleted,
  onUpdate,
}: Props) {
  const titleId = useId();
  const notesFocus = useRef(false);
  const prizeFocus = useRef(false);
  const [goal, setGoal] = useState(String(pair.goal));
  const [zone, setZone] = useState(pair.timezone);
  const [boardName, setBoardName] = useState(pair.title || 'Board');
  const [notes, setNotes] = useState(pair.notes);
  const [scoringMode, setScoringMode] = useState<ScoringMode>(pair.scoring === 'capped' ? 'capped' : 'raw');
  const [dailyMax, setDailyMax] = useState(String(pair.daily_max || 10));
  const [prize, setPrize] = useState(pair.prize || '');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const zones = useMemo(() => {
    const supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    if (supported.includes(pair.timezone)) return supported;
    return [pair.timezone, ...supported];
  }, [pair.timezone]);

  useEffect(() => {
    setGoal(String(pair.goal));
    setZone(pair.timezone);
    setBoardName(pair.title || 'Board');
    setScoringMode(pair.scoring === 'capped' ? 'capped' : 'raw');
    setDailyMax(String(pair.daily_max || 10));
    if (!prizeFocus.current) setPrize(pair.prize || '');
    if (!notesFocus.current) setNotes(pair.notes);
  }, [pair.goal, pair.timezone, pair.notes, pair.title, pair.scoring, pair.daily_max, pair.prize]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  async function saveGoal() {
    const value = Number(goal);
    if (!Number.isInteger(value) || value < 0 || value > 100000) {
      setError('Goal must be a whole number from 0 to 100000.');
      setGoal(String(pair.goal));
      return;
    }
    if (value === pair.goal) return;
    setBusy(true);
    try {
      await onUpdate({ goal: value });
      setError(null);
    } catch (err) {
      setError(messageFrom(err));
      setGoal(String(pair.goal));
    } finally {
      setBusy(false);
    }
  }

  async function saveTimezone(next: string) {
    const clean = next.trim();
    setZone(clean);
    if (clean === pair.timezone) return;
    setBusy(true);
    try {
      await onUpdate({ timezone: clean });
      setError(null);
    } catch (err) {
      setError(messageFrom(err));
      setZone(pair.timezone);
    } finally {
      setBusy(false);
    }
  }

  async function saveScoring(next: ScoringMode) {
    setScoringMode(next);
    if (next === (pair.scoring === 'capped' ? 'capped' : 'raw')) return;
    setBusy(true);
    try {
      await onUpdate({ scoring: next });
      setError(null);
    } catch (err) {
      setError(messageFrom(err));
      setScoringMode(pair.scoring === 'capped' ? 'capped' : 'raw');
    } finally {
      setBusy(false);
    }
  }

  async function saveDailyMax() {
    const value = Number(dailyMax);
    if (!Number.isInteger(value) || value < 1 || value > 1000) {
      setError('Daily maximum must be a whole number from 1 to 1000.');
      setDailyMax(String(pair.daily_max || 10));
      return;
    }
    if (value === (pair.daily_max || 10)) return;
    setBusy(true);
    try {
      await onUpdate({ daily_max: value });
      setError(null);
    } catch (err) {
      setError(messageFrom(err));
      setDailyMax(String(pair.daily_max || 10));
    } finally {
      setBusy(false);
    }
  }

  async function savePrize() {
    prizeFocus.current = false;
    const value = prize.trim();
    if (value.length > 80) {
      setError('Prize must be 80 characters or fewer.');
      setPrize(pair.prize || '');
      return;
    }
    if (value === (pair.prize || '').trim()) return;
    setPrize(value);
    setBusy(true);
    try {
      await onUpdate({ prize: value });
      setError(null);
    } catch (err) {
      setError(messageFrom(err));
      setPrize(pair.prize || '');
    } finally {
      setBusy(false);
    }
  }

  async function saveTitle() {
    const value = boardName.trim();
    if (value.length < 1 || value.length > 40) {
      setError('Board name must be 1 to 40 characters.');
      setBoardName(pair.title || 'Board');
      return;
    }
    if (value === (pair.title || 'Board')) return;
    setBusy(true);
    try {
      await onUpdate({ title: value });
      setError(null);
    } catch (err) {
      setError(messageFrom(err));
      setBoardName(pair.title || 'Board');
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    notesFocus.current = false;
    if (notes === pair.notes) return;
    setBusy(true);
    try {
      await onUpdate({ notes });
      setError(null);
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(false);
    }
  }

  async function wipeNotes() {
    setNotes('');
    setBusy(true);
    try {
      await onUpdate({ notes: '' });
      setError(null);
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(false);
    }
  }

  async function createAnother(event: FormEvent) {
    event.preventDefault();
    const clean = createName.trim();
    if (clean.length < 1 || clean.length > 32) {
      setError('Name must be 1 to 32 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const pairId = await createPair(clean, timezone);
      onOpenBoard(pairId);
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(false);
    }
  }

  async function joinAnother(event: FormEvent) {
    event.preventDefault();
    const cleanName = joinName.trim();
    if (cleanName.length < 1 || cleanName.length > 32) {
      setError('Name must be 1 to 32 characters.');
      return;
    }
    if (joinCode.length !== 6) {
      setError('Enter the 6-character invite code.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const pairId = await joinPair(joinCode, cleanName);
      onOpenBoard(pairId);
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeBoard() {
    setBusy(true);
    setError(null);
    try {
      await deletePair(pair.id);
      onDeleted();
    } catch (err) {
      setError(messageFrom(err));
      setBusy(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(pair.invite_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy the invite code.');
    }
  }

  return (
    <div
      className="scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <h2 id={titleId}>Settings</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </div>

        <label className="field">
          <span>Shared goal</span>
          <input
            inputMode="numeric"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            onBlur={() => void saveGoal()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void saveGoal();
              }
            }}
          />
        </label>

        <fieldset className="choice">
          <legend>Daily scoring</legend>
          <label className={scoringMode === 'raw' ? 'choice-option on' : 'choice-option'}>
            <input
              type="radio"
              name="scoring"
              value="raw"
              checked={scoringMode === 'raw'}
              onChange={() => void saveScoring('raw')}
            />
            Raw points
          </label>
          <label className={scoringMode === 'capped' ? 'choice-option on' : 'choice-option'}>
            <input
              type="radio"
              name="scoring"
              value="capped"
              checked={scoringMode === 'capped'}
              onChange={() => void saveScoring('capped')}
            />
            Daily maximum
          </label>
        </fieldset>
        {scoringMode === 'capped' ? (
          <label className="field">
            <span>Max points in a day</span>
            <input
              inputMode="numeric"
              value={dailyMax}
              onChange={(event) => setDailyMax(event.target.value)}
              onBlur={() => void saveDailyMax()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void saveDailyMax();
                }
              }}
            />
          </label>
        ) : null}
        <p className="help">
          {scoringMode === 'raw'
            ? 'Each item’s numbers are the points. A longer list can score more in a day.'
            : 'A finished day is worth this many points. Each item’s numbers decide its share, so a long list and a short list can tie.'}
        </p>

        <label className="field">
          <span>Prize</span>
          <input
            value={prize}
            maxLength={80}
            placeholder="What you get for reaching the goal"
            onFocus={() => {
              prizeFocus.current = true;
            }}
            onChange={(event) => setPrize(event.target.value)}
            onBlur={() => void savePrize()}
          />
        </label>
        <p className="help">Shown at the top of this board.</p>

        <label className="field">
          <span>Timezone</span>
          {zones.length > 0 ? (
            <select value={zone} onChange={(event) => void saveTimezone(event.target.value)}>
              {zones.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              onBlur={() => void saveTimezone(zone)}
            />
          )}
        </label>
        <p className="help">Midnight in this timezone locks the day.</p>

        <label className="field">
          <span>Notes</span>
          <textarea
            rows={6}
            maxLength={4000}
            value={notes}
            placeholder="A note for everyone on this board"
            onFocus={() => {
              notesFocus.current = true;
            }}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => void saveNotes()}
          />
        </label>
        <div className="sheet-actions">
          <button
            type="button"
            className="button danger"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void wipeNotes()}
            disabled={busy}
          >
            Wipe notes
          </button>
        </div>
        <p className="help">One shared note. Wipe clears it for everyone on this board.</p>

        <label className="field">
          <span>Board name</span>
          <input
            value={boardName}
            maxLength={40}
            onChange={(event) => setBoardName(event.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void saveTitle();
              }
            }}
          />
        </label>

        <div className="invite-block">
          <span>People</span>
          <ul className="people">
            {[...participants]
              .sort((a, b) => a.seat - b.seat)
              .map((person) => (
                <li key={person.id}>
                  {person.display_name}
                  {person.seat === 1 ? <span className="track-meta"> · created this board</span> : null}
                  {person.user_id === userId ? <span className="track-meta"> · you</span> : null}
                </li>
              ))}
          </ul>
        </div>

        <div className="invite-block">
          <span>Invite code</span>
          <div className="invite-row">
            <code>{pair.invite_code}</code>
            <button type="button" className="button" onClick={() => void copyCode()}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {memberships.length > 1 ? (
          <div className="invite-block">
            <span>Your boards</span>
            <div className="stack">
              {memberships.map((membership) => (
                <button
                  key={membership.pair.id}
                  type="button"
                  className={membership.pair.id === pair.id ? 'button primary' : 'button'}
                  onClick={() => onSelectBoard(membership.pair.id)}
                >
                  {membership.pair.title || 'Board'}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form className="invite-block" onSubmit={(event) => void createAnother(event)}>
          <span className="field-label">Create another board</span>
          <label className="field">
            <span>Your name on it</span>
            <input value={createName} maxLength={32} onChange={(event) => setCreateName(event.target.value)} />
          </label>
          <button type="submit" className="button wide" disabled={busy}>
            Create a board
          </button>
        </form>

        <form className="invite-block" onSubmit={(event) => void joinAnother(event)}>
          <span className="field-label">Join another board</span>
          <label className="field">
            <span>Your name on it</span>
            <input value={joinName} maxLength={32} onChange={(event) => setJoinName(event.target.value)} />
          </label>
          <label className="field">
            <span>Invite code</span>
            <input
              className="code-input"
              value={joinCode}
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={6}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(CODE_ALPHABET, '').slice(0, 6))}
            />
          </label>
          <button type="submit" className="button wide" disabled={busy}>
            Join with a code
          </button>
        </form>

        {isCreator ? (
          <div className="invite-block">
            {confirmDelete ? (
              <div className="sheet-actions">
                <button type="button" className="button danger" disabled={busy} onClick={() => void removeBoard()}>
                  Delete for everyone
                </button>
                <button type="button" className="button" disabled={busy} onClick={() => setConfirmDelete(false)}>
                  Keep it
                </button>
              </div>
            ) : (
              <button type="button" className="button danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
                Delete this board
              </button>
            )}
            <p className="help">Deleting removes the board, its habits, and everyone on it.</p>
          </div>
        ) : null}

        {error ? <p className="error">{error}</p> : null}

        <div className="sheet-actions end">
          <button type="button" className="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
