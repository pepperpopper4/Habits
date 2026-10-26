import { useEffect, useId, useState, type FormEvent } from 'react';
import type { Kind } from '../types';

export type TrackDraft = {
  name: string;
  kind: Kind;
  gain: number;
  loss: number;
};

type Props = {
  mode: 'create' | 'counter';
  initial: TrackDraft;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (draft: TrackDraft) => void;
};

function wholePoints(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) return null;
  return parsed;
}

export function AddTrackModal({ mode, initial, busy, error, onClose, onSubmit }: Props) {
  const titleId = useId();
  const [name, setName] = useState(initial.name);
  const [kind, setKind] = useState<Kind>(initial.kind);
  const [gain, setGain] = useState(String(initial.gain));
  const [loss, setLoss] = useState(String(initial.loss));
  const [localError, setLocalError] = useState<string | null>(null);
  const locked = mode === 'counter';

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

  function submit(event: FormEvent) {
    event.preventDefault();
    const cleanName = name.trim();
    const gainPoints = wholePoints(gain);
    const lossPoints = wholePoints(loss);
    if (!locked && (cleanName.length < 1 || cleanName.length > 60)) {
      setLocalError('Name must be 1 to 60 characters.');
      return;
    }
    if (gainPoints === null || lossPoints === null) {
      setLocalError('Points must be whole numbers from 1 to 99.');
      return;
    }
    setLocalError(null);
    onSubmit({ name: cleanName, kind, gain: gainPoints, loss: lossPoints });
  }

  return (
    <div className="scrim" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <form onSubmit={submit}>
          <div className="sheet-head">
            <h2 id={titleId}>{locked ? 'Counter the offer' : 'Add a habit or vice'}</h2>
            <button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label="Close">
              ×
            </button>
          </div>
          <p className="help">
            A check marks a habit done or a vice avoided, and scores the gain. An empty box scores the loss.
          </p>
          <label className="field">
            <span>Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              required
              disabled={locked || busy}
              autoFocus={!locked}
            />
          </label>
          <fieldset className="choice" disabled={locked || busy}>
            <legend>Kind</legend>
            <label className={kind === 'habit' ? 'choice-option on' : 'choice-option'}>
              <input
                type="radio"
                name="kind"
                value="habit"
                checked={kind === 'habit'}
                onChange={() => setKind('habit')}
              />
              Habit
            </label>
            <label className={kind === 'vice' ? 'choice-option on' : 'choice-option'}>
              <input
                type="radio"
                name="kind"
                value="vice"
                checked={kind === 'vice'}
                onChange={() => setKind('vice')}
              />
              Vice
            </label>
          </fieldset>
          <div className="split">
            <label className="field">
              <span>Gain if checked</span>
              <input
                inputMode="numeric"
                value={gain}
                onChange={(event) => setGain(event.target.value)}
                disabled={busy}
                autoFocus={locked}
              />
            </label>
            <label className="field">
              <span>Loss if empty</span>
              <input
                inputMode="numeric"
                value={loss}
                onChange={(event) => setLoss(event.target.value)}
                disabled={busy}
              />
            </label>
          </div>
          {localError || error ? <p className="error">{localError || error}</p> : null}
          <div className="sheet-actions">
            <button type="button" className="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={busy}>
              {locked ? 'Send counter' : 'Send offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
