import { useEffect, useId, useState, type FormEvent } from 'react';
import { ALL_WEEKDAYS, WEEKDAYS } from '../lib/dates';
import type { Kind } from '../types';

export type TrackDraft = {
  name: string;
  kind: Kind;
  gain: number;
  loss: number;
  weekdays: number;
};

type Props = {
  mode: 'create' | 'edit';
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
  const [daily, setDaily] = useState((initial.weekdays || ALL_WEEKDAYS) === ALL_WEEKDAYS);
  const [days, setDays] = useState(initial.weekdays || ALL_WEEKDAYS);
  const [localError, setLocalError] = useState<string | null>(null);

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
    const weekdays = daily ? ALL_WEEKDAYS : days;
    if (cleanName.length < 1 || cleanName.length > 60) {
      setLocalError('Name must be 1 to 60 characters.');
      return;
    }
    if (gainPoints === null || lossPoints === null) {
      setLocalError('Points must be whole numbers from 1 to 99.');
      return;
    }
    if (weekdays < 1) {
      setLocalError('Pick at least one day.');
      return;
    }
    setLocalError(null);
    onSubmit({ name: cleanName, kind, gain: gainPoints, loss: lossPoints, weekdays });
  }

  return (
    <div className="scrim" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <form onSubmit={submit}>
          <div className="sheet-head">
            <h2 id={titleId}>{mode === 'edit' ? 'Edit' : 'Add a habit or vice'}</h2>
            <button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label="Close">
              ×
            </button>
          </div>
          <p className="help">
            A check marks a habit done or a vice avoided, and scores the gain. An empty box scores the loss.
            {mode === 'edit'
              ? ' Days you leave off stay off the list and do not score.'
              : ' It is added to your list right away.'}
          </p>
          <label className="field">
            <span>Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              required
              disabled={busy}
              autoFocus
            />
          </label>
          <fieldset className="choice" disabled={busy}>
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
          <label className="daily-row">
            <input
              type="checkbox"
              checked={daily}
              disabled={busy}
              onChange={(event) => {
                const next = event.target.checked;
                setDaily(next);
                if (!next && days < 1) setDays(ALL_WEEKDAYS);
              }}
            />
            <span>Daily</span>
          </label>
          {daily ? null : (
            <div className="weekday-board" role="group" aria-label="Days">
              {WEEKDAYS.map((day) => {
                const on = (days & (1 << day.bit)) !== 0;
                return (
                  <button
                    key={day.name}
                    type="button"
                    className={on ? 'weekday on' : 'weekday'}
                    aria-pressed={on}
                    aria-label={day.name}
                    disabled={busy}
                    onClick={() => setDays((current) => current ^ (1 << day.bit))}
                  >
                    {day.letter}
                  </button>
                );
              })}
            </div>
          )}
          {localError || error ? <p className="error">{localError || error}</p> : null}
          <div className="sheet-actions">
            <button type="button" className="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={busy}>
              {mode === 'edit' ? 'Save' : 'Add it'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
