import { useState } from 'react';
import type { DayPhase } from '../lib/useDayColumn';
import { formatDayLabel, isScheduled, scheduleLabel } from '../lib/dates';
import { historyKind, historyLevel } from '../lib/history';
import { formatChange, formatPoints, pointsForDay, settledScore, trackShare, type Scoring } from '../lib/score';
import type { Check, Nudge, Participant, Track } from '../types';
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
  onEdit?: (track: Track) => void;
  addDisabled?: boolean;
  nudges?: Nudge[];
  namesByUser?: Map<string, string>;
  viewerUserId?: string;
  onNudge?: (track: Track) => void;
};

export function nudgeNote(
  nudges: Nudge[],
  namesByUser: Map<string, string> | undefined,
  trackId: string,
  day: string,
  ownerUserId: string,
  editable: boolean,
): string | null {
  if (!editable) return null;
  const incoming = nudges.filter((nudge) => nudge.track_id === trackId && nudge.day === day && nudge.to_user_id === ownerUserId);
  if (incoming.length === 0) return null;
  const names = incoming.map((nudge) => namesByUser?.get(nudge.from_user_id) ?? 'Someone');
  const label = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  return `${label} nudged you`;
}

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
  onEdit,
  addDisabled = false,
  nudges = [],
  namesByUser,
  viewerUserId,
  onNudge,
}: Props) {
  const resting = allTracks.filter(
    (track) => track.owner_id === person.id && track.starts_on <= day && !isScheduled(track.weekdays, day),
  );
  const todayPoints = pointsForDay(allTracks, checks, person.id, day, scoring);
  const settled = settledScore(allTracks, checks, person.id, day, scoring);
  const tone = historyKind({ day, ...todayPoints });
  const level = historyLevel({ day, ...todayPoints });
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
          <span className="today-line">
            <span className="today-label">Today</span>
            <span
              className={`day-net ${tone}`}
              style={{ ['--level' as string]: level }}
              data-today={todayPoints.score}
            >
              {formatChange(todayPoints.score)}
            </span>
          </span>
          <span>
            <span className="score" data-score={settled}>
              {formatPoints(settled)}
            </span>
            <span className="goal"> / {goal}</span>
          </span>
        </p>
      </div>
      <ProgressBar score={settled} goal={goal} />
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
                  onEdit={onEdit}
                  nudgeNote={nudgeNote(nudges, namesByUser, track.id, day, person.user_id, editable)}
                  canNudge={!editable && phase === 'shown'}
                  nudged={nudges.some(
                    (nudge) => nudge.track_id === track.id && nudge.day === day && nudge.from_user_id === viewerUserId,
                  )}
                  onNudge={onNudge}
                />
                );
              })}
            </div>
          )}
        </div>
      </div>
      {onEdit && resting.length > 0 ? (
        <div className="resting">
          <p className="help">Other days</p>
          {resting.map((track) => (
            <button key={track.id} type="button" className="track-text" onClick={() => onEdit(track)}>
              <span className="track-name">{track.name}</span>
              <span className="track-meta">{scheduleLabel(track.weekdays)}</span>
            </button>
          ))}
        </div>
      ) : null}
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
