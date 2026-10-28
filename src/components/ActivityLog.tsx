import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDayLabel } from '../lib/dates';
import { historyKind, historyLevel, historyPhrase, historyWeeks, monthLabels, type DayScore } from '../lib/history';

const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

type Props = {
  days: DayScore[];
  timeZone: string;
};

export function ActivityLog({ days, timeZone }: Props) {
  const weeks = useMemo(() => (days.length === 0 ? [] : historyWeeks(days[0].day, days[days.length - 1].day)), [days]);
  const labels = useMemo(() => monthLabels(weeks), [weeks]);
  const byDay = useMemo(() => new Map(days.map((day) => [day.day, day])), [days]);
  const [selectedId, setSelectedId] = useState(days.at(-1)?.day ?? null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selected = selectedId ? byDay.get(selectedId) ?? null : null;

  useEffect(() => {
    setSelectedId(days.at(-1)?.day ?? null);
  }, [days]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, [weeks]);

  if (days.length === 0) {
    return <p className="empty">Your days will show up here once a habit starts.</p>;
  }

  return (
    <div className="history-sheet activity-log">
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
                    day && byDay.get(day) ? (
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
      <div className="history-legend" aria-hidden="true">
        <span>Lost</span>
        <span className="history-cell lost" style={{ ['--level' as string]: 1 }} />
        <span className="history-cell lost" style={{ ['--level' as string]: 0.4 }} />
        <span className="history-cell flat" />
        <span className="history-cell kept" style={{ ['--level' as string]: 0.4 }} />
        <span className="history-cell kept" style={{ ['--level' as string]: 1 }} />
        <span>Kept</span>
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
      onClick={() => onSelect(day.day)}
    />
  );
}
