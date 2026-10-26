import { useEffect, useState } from 'react';
import { nextMidnightDelay, todayKey } from './dates';

export type DayPhase = 'shown' | 'leaving' | 'entering';

const LEAVE_MS = 450;
const ENTER_MS = 480;

export function useDayColumn(timeZone: string): { day: string; phase: DayPhase } {
  const [day, setDay] = useState(() => todayKey(timeZone));
  const [phase, setPhase] = useState<DayPhase>('shown');

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let dayNow = todayKey(timeZone);
    let phaseNow: DayPhase = 'shown';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setDay(dayNow);
    setPhase('shown');

    const later = (delay: number, run: () => void) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!cancelled) run();
      }, delay);
    };

    const arm = () => {
      if (phaseNow !== 'shown') return;
      const now = new Date();
      const current = todayKey(timeZone, now);
      if (current !== dayNow) {
        rollTo(current);
        return;
      }
      later(Math.max(1000, nextMidnightDelay(timeZone, now)), () => {
        const next = todayKey(timeZone);
        if (next === dayNow) arm();
        else rollTo(next);
      });
    };

    const finishEnter = () => {
      phaseNow = 'shown';
      setPhase('shown');
      arm();
    };

    const rollTo = (next: string) => {
      if (cancelled || phaseNow !== 'shown' || next === dayNow) return;
      if (reduceMotion) {
        dayNow = next;
        phaseNow = 'shown';
        setDay(next);
        setPhase('shown');
        arm();
        return;
      }
      phaseNow = 'leaving';
      setPhase('leaving');
      later(LEAVE_MS, () => {
        dayNow = next;
        phaseNow = 'entering';
        setDay(next);
        setPhase('entering');
        later(ENTER_MS, finishEnter);
      });
    };

    arm();

    const onVisible = () => {
      if (document.visibilityState === 'visible') arm();
    };
    document.addEventListener('visibilitychange', onVisible);
    const poll = window.setInterval(() => {
      arm();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [timeZone]);

  return { day, phase };
}
