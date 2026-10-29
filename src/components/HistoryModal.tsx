import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatDayLabel } from '../lib/dates';
import { historyKind, historyLevel, historyPhrase, historyWeeks, monthLabels, personHistory, type DayScore } from '../lib/history';
import type { Scoring } from '../lib/score';
import type { Check, Track } from '../types';

type Props = {
  name: string;
  tracks: Track[];
  checks: Check[];
  ownerId: string;
  today: string;
  timeZone: string;
  scoring: Scoring;
  onClose: () => void;
};

const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

export function HistoryModal({ name, tracks, checks, ownerId, today, timeZone, scoring, onClose }: Props) {
  const titleId = useId();
  const days = useMemo(
    () => personHistory(tracks, checks, ownerId, today, scoring),
    [tracks, checks, ownerId, today, scoring],
  );
  const weeks = useMemo(() => (days.length === 0 ? [] : historyWeeks(days[0].day, days[days.length - 1].day)), [days]);
  const labels = useMemo(() => monthLabels(weeks), [weeks]);
  const byDay = useMemo(() => new Map(days.map((day) => [day.day, day])), [days]);
  const [selectedId, setSelectedId] = useState(days.at(-1)?.day ?? null);
  const selected = selectedId ? byDay.get(selectedId) ?? null : null;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, [weeks]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet history-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <h2 id={titleId}>{name}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close history">
            ×
          </button>
        </div>
        <p className="help">Each square is one day. Green is points kept, red is points lost.</p>
        {days.length === 0 ? (
          <p className="empty">History starts when a habit or vice is accepted.</p>
        ) : (
          <>
            <div className="history-scroll" ref={scrollRef}>
              <div className="history">
                <div className="history-months" aria-hidden="true">
                  <span className="history-dow-spacer" />
                  <div className="history-weeks">
                    {labels.map((label, index) => (
                      <span key={weeks[index]?.find((day) => day) ?? index} className="history-month">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="history-body">
                  <div className="history-dows" aria-hidden="true">
                    {WEEKDAYS.map((label, index) => (
                      <span key={index}>{label}</span>
                    ))}
                  </div>
                  <div className="history-weeks">
                    {weeks.map((week, weekIndex) => (
                      <div key={week.find((day) => day) ?? weekIndex} className="history-week">
                        {week.map((day, dayIndex) =>
                          day ? (
                            <DayCell
                              key={day}
                              day={byDay.get(day)!}
                              timeZone={timeZone}
                              selected={day === selectedId}
                              onSelect={setSelectedId}
                            />
                          ) : (
                            <span key={`pad-${weekIndex}-${dayIndex}`} className="history-cell pad" />
                          ),
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="history-detail">{selected ? `${formatDayLabel(selected.day, timeZone)} · ${historyPhrase(selected)}` : null}</p>
          </>
        )}
        <div className="history-legend" aria-hidden="true">
          <span>lost</span>
          <span className="history-cell lost" style={{ ['--level' as string]: 1 }} />
          <span className="history-cell lost" style={{ ['--level' as string]: 0.4 }} />
          <span className="history-cell flat" />
          <span className="history-cell kept" style={{ ['--level' as string]: 0.4 }} />
          <span className="history-cell kept" style={{ ['--level' as string]: 1 }} />
          <span>kept</span>
        </div>
      </div>
    </div>
  );
}

function DayCell({
  day,
  timeZone,
  selected,
  onSelect,
}: {
  day: DayScore;
  timeZone: string;
  selected: boolean;
  onSelect: (day: string) => void;
}) {
  const kind = historyKind(day);
  const level = historyLevel(day);
  return (
    <button
      type="button"
      className={selected ? `history-cell ${kind} on` : `history-cell ${kind}`}
      style={{ ['--level' as string]: level }}
      aria-label={`${formatDayLabel(day.day, timeZone)}, ${historyPhrase(day)}`}
      aria-pressed={selected}
      onMouseEnter={() => onSelect(day.day)}
      onFocus={() => onSelect(day.day)}
      onClick={() => onSelect(day.day)}
    />
  );
}
