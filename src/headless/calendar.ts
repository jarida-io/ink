/**
 * Calendar arithmetic, with no `Date` object anywhere in it.
 *
 * ## Why not `Date`
 *
 * Every calendar bug I have ever had to fix came from doing day arithmetic on a
 * timestamp. `new Date(y, m, d + 1)` is not "tomorrow" — it is "86,400,000ms
 * later", and on the two days a year a timezone shifts, those are different
 * days. A grid built that way repeats or skips a cell, once, in one timezone,
 * for one user, and looks perfect everywhere it is tested.
 *
 * A calendar is not a moment in time. It is a grid of *civil dates* — a year, a
 * month and a day, with no timezone and no clock — so that is what this module
 * works in. Nothing here can be off by an hour because nothing here knows what
 * an hour is.
 *
 * Converting to and from a real `Date` is the caller's job and happens once, at
 * the edge, where the timezone is a decision somebody makes rather than one the
 * arithmetic makes for them.
 */

export interface CivilDate {
  year: number;
  /** 1–12. Not zero-based, because every off-by-one month bug starts there. */
  month: number;
  day: number;
}

/** 0 is Sunday, through 6 for Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function isLeapYear(year: number): boolean {
  // The century rule is the part people leave out, and it is wrong once every
  // hundred years — which is to say, it was wrong in 1900 and will be in 2100.
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return MONTH_LENGTHS[month - 1];
}

/**
 * Day of the week for a civil date, by Sakamoto's method.
 *
 * Chosen over a `Date` round trip for the reason above, and over Zeller because
 * it is shorter and the table is checkable by hand.
 */
export function dayOfWeek(date: CivilDate): Weekday {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = date.year;
  if (date.month < 3) y -= 1;
  return (((y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[date.month - 1] + date.day) %
    7) +
    7) %
    7 as Weekday;
}

export function isSameDay(a: CivilDate | null, b: CivilDate | null): boolean {
  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/** Negative when `a` is earlier. Safe to sort with. */
export function compareDates(a: CivilDate, b: CivilDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

export function addMonths(date: CivilDate, delta: number): CivilDate {
  const zero = date.month - 1 + delta;
  const year = date.year + Math.floor(zero / 12);
  const month = ((zero % 12) + 12) % 12 + 1;
  // 31 January plus one month is 28 or 29 February, not 3 March. Clamping is
  // what every calendar UI means by "next month" even though it is not
  // reversible — and a non-reversible answer people expect beats a reversible
  // one that surprises them.
  return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
}

export function addDays(date: CivilDate, delta: number): CivilDate {
  let { year, month, day } = date;
  day += delta;
  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month);
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  while (day < 1) {
    month -= 1;
    if (month < 1) { month = 12; year -= 1; }
    day += daysInMonth(year, month);
  }
  return { year, month, day };
}

export interface CalendarCell {
  date: CivilDate;
  /** False for the leading and trailing days borrowed from the months either side. */
  inMonth: boolean;
  isToday: boolean;
  selected: boolean;
  disabled: boolean;
  /** Inside a selected range, but not an endpoint. */
  inRange: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
}

export interface MonthGridOptions {
  weekStartsOn?: Weekday;
  today?: CivilDate | null;
  selected?: CivilDate | null;
  /** For a range picker. Endpoints are marked separately from the middle. */
  range?: { start: CivilDate | null; end: CivilDate | null };
  min?: CivilDate | null;
  max?: CivilDate | null;
  isDisabled?: (date: CivilDate) => boolean;
}

/**
 * Six weeks, always.
 *
 * A month needs four to six depending on its length and which weekday it starts
 * on, and a grid that changes height between months makes everything under it
 * jump as you page through. Fixing it at six costs a row of greyed dates and
 * buys a calendar that does not move.
 */
export const WEEKS_IN_GRID = 6;

export function monthGrid(
  year: number,
  month: number,
  options: MonthGridOptions = {},
): CalendarCell[][] {
  const {
    weekStartsOn = 1,
    today = null,
    selected = null,
    range,
    min = null,
    max = null,
    isDisabled,
  } = options;

  const first: CivilDate = { year, month, day: 1 };
  const lead = (dayOfWeek(first) - weekStartsOn + 7) % 7;
  const start = addDays(first, -lead);

  const weeks: CalendarCell[][] = [];
  let cursor = start;

  for (let week = 0; week < WEEKS_IN_GRID; week += 1) {
    const row: CalendarCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const outOfBounds =
        (min !== null && compareDates(cursor, min) < 0) ||
        (max !== null && compareDates(cursor, max) > 0);

      const rangeStart = isSameDay(cursor, range?.start ?? null);
      const rangeEnd = isSameDay(cursor, range?.end ?? null);
      const inRange =
        !!range?.start &&
        !!range?.end &&
        compareDates(cursor, range.start) > 0 &&
        compareDates(cursor, range.end) < 0;

      row.push({
        date: cursor,
        inMonth: cursor.month === month && cursor.year === year,
        isToday: isSameDay(cursor, today),
        selected: isSameDay(cursor, selected) || rangeStart || rangeEnd,
        disabled: outOfBounds || (isDisabled?.(cursor) ?? false),
        inRange,
        rangeStart,
        rangeEnd,
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(row);
  }

  return weeks;
}

/** Weekday indices in display order, for the column headers. */
export function weekdayOrder(weekStartsOn: Weekday = 1): Weekday[] {
  return Array.from({ length: 7 }, (_, i) => ((weekStartsOn + i) % 7) as Weekday);
}

/**
 * Keyboard movement in a month grid.
 *
 * Arrows move a day or a week, Page keys a month, Home and End to the ends of
 * the week. Returns null for a key it does not own so the host can let it
 * through — a calendar that swallows Tab is a calendar you cannot leave.
 */
export function moveFocus(date: CivilDate, key: string): CivilDate | null {
  switch (key) {
    case "ArrowRight": return addDays(date, 1);
    case "ArrowLeft": return addDays(date, -1);
    case "ArrowDown": return addDays(date, 7);
    case "ArrowUp": return addDays(date, -7);
    case "PageDown": return addMonths(date, 1);
    case "PageUp": return addMonths(date, -1);
    case "Home": return addDays(date, -((dayOfWeek(date) + 6) % 7));
    case "End": return addDays(date, 6 - ((dayOfWeek(date) + 6) % 7));
    default: return null;
  }
}

/* ── Time ──────────────────────────────────────────────────────────────── */

export interface CivilTime {
  /** 0–23. Always 24-hour internally; 12-hour is a formatting decision. */
  hour: number;
  minute: number;
}

/**
 * Every time on the clock at a given step.
 *
 * A list rather than three spinners, because a step of 15 gives 96 options —
 * short enough to scroll and far quicker to hit than dialling hours and minutes
 * separately. Below a step of 5 it stops being true and a spinner is better.
 */
export function timeOptions(stepMinutes = 15): CivilTime[] {
  if (stepMinutes <= 0 || 1440 % stepMinutes !== 0) {
    throw new Error(`ink: a time step must divide 1440 evenly; ${stepMinutes} does not`);
  }
  const out: CivilTime[] = [];
  for (let minutes = 0; minutes < 1440; minutes += stepMinutes) {
    out.push({ hour: Math.floor(minutes / 60), minute: minutes % 60 });
  }
  return out;
}

export function compareTimes(a: CivilTime, b: CivilTime): number {
  return a.hour - b.hour || a.minute - b.minute;
}

/** `14:05`, or `2:05 pm`. Formatting only — the value stays 24-hour. */
export function formatTime(time: CivilTime, hour12 = false): string {
  const mm = String(time.minute).padStart(2, "0");
  if (!hour12) return `${String(time.hour).padStart(2, "0")}:${mm}`;
  const suffix = time.hour < 12 ? "am" : "pm";
  const hour = time.hour % 12 === 0 ? 12 : time.hour % 12;
  return `${hour}:${mm} ${suffix}`;
}

/** Bridge to and from a real `Date`, at the edge, where a timezone is a choice. */
export function toCivilDate(date: Date): CivilDate {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

export function fromCivilDate(date: CivilDate, time?: CivilTime): Date {
  return new Date(date.year, date.month - 1, date.day, time?.hour ?? 0, time?.minute ?? 0);
}
