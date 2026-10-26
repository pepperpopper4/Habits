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

export function TrackRow({ track, gain, loss, checked, editable, busy, onToggle, onEdit }: Props) {
  const kindLabel = track.kind === 'habit' ? 'Habit' : 'Vice';
  const stateLabel = checked ? 'checked' : 'not checked';
  const days = scheduleLabel(track.weekdays);
  const box = (
    <span className="check-box">
      {checked ? <CheckMark /> : null}
    </span>
  );

  return (
    <div className="track">
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
          </span>
        </div>
      )}
      {editable ? (
        <button
          type="button"
          className={checked ? 'check on' : 'check'}
          aria-pressed={checked}
          aria-label={`${track.name}, ${kindLabel}, ${stateLabel}`}
          disabled={busy}
          onClick={() => onToggle(track, checked)}
        >
          {box}
        </button>
      ) : (
        <span className={checked ? 'check on' : 'check'} role="img" aria-label={`${track.name}, ${kindLabel}, ${stateLabel}`}>
          {box}
        </span>
      )}
    </div>
  );
}
