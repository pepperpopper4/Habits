import { useId } from 'react';

type Props = {
  score: number;
  goal: number;
};

export function ProgressBar({ score, goal }: Props) {
  const labelId = useId();
  const ratio = goal > 0 ? Math.max(0, Math.min(1, score / goal)) : 0;
  const shown = Math.max(0, Math.min(goal > 0 ? goal : 0, score));

  return (
    <div
      className="progress"
      role="progressbar"
      aria-labelledby={labelId}
      aria-valuemin={0}
      aria-valuemax={goal > 0 ? goal : 0}
      aria-valuenow={shown}
    >
      <span id={labelId} className="sr-only">
        Points toward the shared goal
      </span>
      <span className="progress-fill" style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}
