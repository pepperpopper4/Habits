export function todayKey(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) {
    throw new Error('Could not read the calendar date.');
  }
  return `${year}-${month}-${day}`;
}

export const ALL_WEEKDAYS = 127;

export const WEEKDAYS = [
  { bit: 0, letter: 'S', name: 'Sunday', short: 'Sun' },
  { bit: 1, letter: 'M', name: 'Monday', short: 'Mon' },
  { bit: 2, letter: 'T', name: 'Tuesday', short: 'Tue' },
  { bit: 3, letter: 'W', name: 'Wednesday', short: 'Wed' },
  { bit: 4, letter: 'T', name: 'Thursday', short: 'Thu' },
  { bit: 5, letter: 'F', name: 'Friday', short: 'Fri' },
  { bit: 6, letter: 'S', name: 'Saturday', short: 'Sat' },
] as const;

export function weekdayIndex(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isScheduled(weekdays: number | null | undefined, isoDate: string): boolean {
  const mask = weekdays == null ? ALL_WEEKDAYS : weekdays;
  return (mask & (1 << weekdayIndex(isoDate))) !== 0;
}

export function scheduleLabel(weekdays: number | null | undefined): string | null {
  const mask = weekdays == null ? ALL_WEEKDAYS : weekdays;
  if (mask === ALL_WEEKDAYS) return null;
  return WEEKDAYS.filter((day) => mask & (1 << day.bit))
    .map((day) => day.short)
    .join(' ');
}

export function addDay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getUTCDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function daysFrom(start: string, end: string): string[] {
  if (start > end) return [];
  const days: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDay(cursor);
    if (days.length > 20000) break;
  }
  return days;
}

export function nextMidnightDelay(timeZone: string, now = new Date()): number {
  const today = todayKey(timeZone, now);
  let low = now.getTime();
  let high = low + 36 * 60 * 60 * 1000;
  while (todayKey(timeZone, new Date(high)) === today) {
    high += 12 * 60 * 60 * 1000;
  }
  while (high - low > 1000) {
    const mid = Math.floor((low + high) / 2);
    if (todayKey(timeZone, new Date(mid)) === today) low = mid;
    else high = mid;
  }
  return Math.max(0, high - now.getTime());
}

export function formatDayLabel(isoDate: string, timeZone: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  let instant = Date.UTC(year, month - 1, day, 12, 0, 0);
  for (let step = 0; step < 30; step += 1) {
    const key = todayKey(timeZone, new Date(instant));
    if (key === isoDate) break;
    instant += (key < isoDate ? 1 : -1) * 60 * 60 * 1000;
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(new Date(instant));
}
