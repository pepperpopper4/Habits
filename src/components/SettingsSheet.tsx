import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { messageFrom } from '../lib/api';
import type { Pair } from '../types';

type PairPatch = {
  goal?: number;
  notes?: string;
  timezone?: string;
};

type Props = {
  pair: Pair;
  onClose: () => void;
  onSignOut: () => void;
  onUpdate: (patch: PairPatch) => Promise<void>;
};

export function SettingsSheet({ pair, onClose, onSignOut, onUpdate }: Props) {
  const titleId = useId();
  const notesFocus = useRef(false);
  const [goal, setGoal] = useState(String(pair.goal));
  const [zone, setZone] = useState(pair.timezone);
  const [notes, setNotes] = useState(pair.notes);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const zones = useMemo(() => {
    const supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    if (supported.includes(pair.timezone)) return supported;
    return [pair.timezone, ...supported];
  }, [pair.timezone]);

  useEffect(() => {
    setGoal(String(pair.goal));
    setZone(pair.timezone);
    if (!notesFocus.current) setNotes(pair.notes);
  }, [pair.goal, pair.timezone, pair.notes]);

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
            placeholder="A note for the two of you"
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
        <p className="help">One shared note. Wipe clears it for both of you.</p>

        <div className="invite-block">
          <span>Invite code</span>
          <div className="invite-row">
            <code>{pair.invite_code}</code>
            <button type="button" className="button" onClick={() => void copyCode()}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

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
