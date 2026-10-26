import { useState } from 'react';
import type { DayPhase } from '../lib/useDayColumn';
import { formatDayLabel } from '../lib/dates';
import { formatPoints, scoreParticipant, trackShare, type Scoring } from '../lib/score';
import type { Check, Participant, Track } from '../types';
import { HistoryModal } from './HistoryModal';
import { ProgressBar } from './ProgressBar';
import { TrackRow } from './TrackRow';

type Props = {
  person: Participant;
  tracks: Track[];
  checks: Check[];
  allTracks: Track[];
  day: string;
  phase: DayPhase;
  timeZone: string;
  goal: number;
  scoring: Scoring;
  editable: boolean;
  busyTrackId: string | null;
  onToggle: (track: Track, checked: boolean) => void;
  onAdd?: () => void;
  addDisabled?: boolean;
};

export function PersonPanel({
  person,
  tracks,
  checks,
  allTracks,
  day,
  phase,
  timeZone,
  goal,
  scoring,
  editable,
  busyTrackId,
  onToggle,
  onAdd,
  addDisabled = false,
}: Props) {
  const score = scoreParticipant(allTracks, checks, person.id, day, scoring);
  const columnClass = phase === 'shown' ? 'day-column' : `day-column ${phase}`;
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <section className="panel" aria-label={person.display_name}>
      <div className="panel-head">
        <h2>
          <button type="button" className="name-button" onClick={() => setHistoryOpen(true)}>
            {person.display_name}
          </button>
        </h2>
        <p className="score-line">
          <span className="score" data-score={score}>
            {formatPoints(score)}
          </span>
          <span className="goal"> / {goal}</span>
        </p>
      </div>
      <ProgressBar score={score} goal={goal} />
      <div className="day-window">
        <div key={day} className={columnClass} data-day={day} data-phase={phase}>
          <p className="day-label">{formatDayLabel(day, timeZone)}</p>
          {tracks.length === 0 ? (
            <p className="empty">{editable ? 'Nothing on your list yet.' : 'Nothing on this list yet.'}</p>
          ) : (
            <div className="track-list">
              {tracks.map((track) => {
                const share = trackShare(track, allTracks, day, scoring);
                return (
                <TrackRow
                  key={track.id}
                  track={track}
                  gain={share.gain}
                  loss={share.loss}
                  checked={checks.some((check) => check.track_id === track.id && check.day === day)}
                  editable={editable && phase === 'shown'}
                  busy={busyTrackId === track.id}
                  onToggle={onToggle}
                />
                );
              })}
            </div>
          )}
        </div>
      </div>
      {onAdd ? (
        <button type="button" className="add-button" onClick={onAdd} disabled={addDisabled} aria-label="Add a habit or vice">
          +
        </button>
      ) : null}
      {historyOpen ? (
        <HistoryModal
          name={person.display_name}
          tracks={allTracks}
          checks={checks}
          ownerId={person.id}
          today={day}
          timeZone={timeZone}
          scoring={scoring}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}
    </section>
  );
}
