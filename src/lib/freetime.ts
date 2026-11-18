import { addDays, atTime, startOfDay } from "./time";

export type Availability = { weekday: number; start_time: string; end_time: string };
export type Commitment = {
  title: string;
  weekdays: number[];
  start_time: string;
  end_time: string;
  is_active?: boolean;
};
export type CalEvent = {
  title: string;
  starts_at: string;
  ends_at: string;
  recurrence?: string | null;
  deleted_at?: string | null;
};
export type Interval = { start: Date; end: Date };
export type FreeWindow = Interval & { minutes: number };

function subtract(windows: Interval[], busy: Interval): Interval[] {
  const out: Interval[] = [];
  for (const w of windows) {
    if (busy.end <= w.start || busy.start >= w.end) {
      out.push(w);
      continue;
    }
    if (busy.start > w.start) out.push({ start: w.start, end: busy.start });
    if (busy.end < w.end) out.push({ start: busy.end, end: w.end });
  }
  return out;
}

/** Occurrences of a calendar event that touch the given day (weekly recurrence expanded). */
export function eventOccurrencesOnDay(ev: CalEvent, day: Date): Interval[] {
  if (ev.deleted_at) return [];
  const s = new Date(ev.starts_at);
  const e = new Date(ev.ends_at);
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  if (ev.recurrence === "weekly") {
    if (startOfDay(s) > dayStart) return [];
    const diffDays = Math.round((dayStart.getTime() - startOfDay(s).getTime()) / 86400000);
    if (diffDays % 7 !== 0) return [];
    const shift = diffDays * 86400000;
    return [{ start: new Date(s.getTime() + shift), end: new Date(e.getTime() + shift) }];
  }
  if (e <= dayStart || s >= dayEnd) return [];
  return [{ start: s, end: e }];
}

/**
 * Free windows = what the user declared as available, minus recurring commitments
 * and calendar entries. Nothing is presumed: no declared availability means no window.
 */
export function computeFreeWindows(opts: {
  availability: Availability[];
  commitments: Commitment[];
  events: CalEvent[];
  from: Date;
  days: number;
  minMinutes?: number;
}): FreeWindow[] {
  const { availability, commitments, events, from, days, minMinutes = 30 } = opts;
  const result: FreeWindow[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(startOfDay(from), i);
    const wd = day.getDay();
    let windows: Interval[] = availability
      .filter((a) => a.weekday === wd)
      .map((a) => ({ start: atTime(day, a.start_time), end: atTime(day, a.end_time) }));
    for (const c of commitments) {
      if (c.is_active === false || !c.weekdays.includes(wd)) continue;
      windows = subtract(windows, { start: atTime(day, c.start_time), end: atTime(day, c.end_time) });
    }
    for (const ev of events) {
      for (const occ of eventOccurrencesOnDay(ev, day)) windows = subtract(windows, occ);
    }
    for (const w of windows) {
      const start = w.start < from ? from : w.start;
      if (w.end <= start) continue;
      const minutes = Math.round((w.end.getTime() - start.getTime()) / 60000);
      if (minutes >= minMinutes) result.push({ start, end: w.end, minutes });
    }
  }
  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Pairs of overlapping entries on a day, for the "conflito" warning. */
export function findConflicts(items: (Interval & { id: string })[]): Set<string> {
  const ids = new Set<string>();
  const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime());
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].start >= sorted[i].end) break;
      ids.add(sorted[i].id);
      ids.add(sorted[j].id);
    }
  }
  return ids;
}
