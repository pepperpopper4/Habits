import { useEffect, useRef, useState } from 'react';
import { scheduleLabel } from '../lib/dates';
import { formatPoints } from '../lib/score';
import type { Track } from '../types';

type Props = {
  track: Track;
  gain: number;
  loss: number;
  checked: boolean;
  editable: boolean;
  busy: boolean;
  onToggle: (track: Track, checked: boolean) => void;
  onEdit?: (track: Track) => void;
  nudgeNote?: string | null;
  canNudge?: boolean;
  nudged?: boolean;
  onNudge?: (track: Track) => void;
};

function CheckMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.2 8.3 6.4 11.4 12.8 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrackRow({
  track,
  gain,
  loss,
  checked,
  editable,
  busy,
  onToggle,
  onEdit,
  nudgeNote,
  canNudge = false,
  nudged = false,
  onNudge,
}: Props) {
  const kindLabel = track.kind === 'habit' ? 'Habit' : 'Vice';
  const stateLabel = checked ? 'checked' : 'not checked';
  const days = scheduleLabel(track.weekdays);
  const wasChecked = useRef(checked);
  const [floated, setFloated] = useState<string | null>(null);

  useEffect(() => {
    if (checked && !wasChecked.current) {
      setFloated(`+${formatPoints(gain)}`);
      const timer = window.setTimeout(() => setFloated(null), 640);
      wasChecked.current = checked;
      return () => window.clearTimeout(timer);
    }
    wasChecked.current = checked;
  }, [checked, gain]);
  const box = (
    <span className="check-box">
      {checked ? <CheckMark /> : null}
    </span>
  );

  return (
    <div className={nudgeNote ? 'track sway' : 'track'}>
      {onEdit ? (
        <button type="button" className="track-text" onClick={() => onEdit(track)}>
          <span className="track-name">{track.name}</span>
          <span className="track-meta">
            {kindLabel}
            <span aria-hidden="true"> · </span>+{formatPoints(gain)} / −{formatPoints(loss)}
            {days ? (
              <>
                <span aria-hidden="true"> · </span>
                {days}
              </>
            ) : null}
            {track.visibility === 'public' ? (
              <>
                <span aria-hidden="true"> · </span>public
              </>
            ) : null}
          </span>
        </button>
      ) : (
        <div className="track-copy">
          <span className="track-name">{track.name}</span>
          <span className="track-meta">
            {kindLabel}
            <span aria-hidden="true"> · </span>+{formatPoints(gain)} / −{formatPoints(loss)}
            {days ? (
              <>
                <span aria-hidden="true"> · </span>
                {days}
              </>
            ) : null}
            {track.visibility === 'public' ? (
              <>
                <span aria-hidden="true"> · </span>public
              </>
            ) : null}
          </span>
        </div>
      )}
      {nudgeNote ? <p className="nudge-note">{nudgeNote}</p> : null}
      {canNudge && !checked && onNudge ? (
        <button type="button" className="nudge" disabled={busy || nudged} onClick={() => onNudge(track)}>
          {nudged ? 'nudged' : 'nudge'}
        </button>
      ) : null}
      {editable ? (
        <button
          type="button"
          className={checked ? `check on ${track.kind}` : `check ${track.kind}`}
          aria-pressed={checked}
          aria-label={`${track.name}, ${kindLabel}, ${stateLabel}`}
          disabled={busy}
          onClick={() => onToggle(track, checked)}
        >
          {box}
          {floated ? <span className="gain-chip">{floated}</span> : null}
        </button>
      ) : (
        <span className={checked ? `check on ${track.kind}` : `check ${track.kind}`} role="img" aria-label={`${track.name}, ${kindLabel}, ${stateLabel}`}>
          {box}
        </span>
      )}
    </div>
  );
}
