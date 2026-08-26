import { describe, expect, it } from "vitest";
import {
  WEEKS_IN_GRID,
  addDays,
  addMonths,
  compareDates,
  dayOfWeek,
  daysInMonth,
  formatTime,
  isLeapYear,
  isSameDay,
  monthGrid,
  moveFocus,
  timeOptions,
  toCivilDate,
  weekdayOrder,
  type CivilDate,
} from "./calendar.js";

const d = (year: number, month: number, day: number): CivilDate => ({ year, month, day });

describe("leap years", () => {
  it("gets the century rule right, which is the part people leave out", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2023)).toBe(false);
    expect(isLeapYear(1900)).toBe(false); // divisible by 100, not by 400
    expect(isLeapYear(2000)).toBe(true); // divisible by 400
    expect(isLeapYear(2100)).toBe(false);
  });

  it("gives February the right length in both cases", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });
});

describe("day of the week", () => {
  /**
   * Cross-checked against `Date` rather than trusted. Sakamoto's table is the
   * kind of thing that is one digit wrong for a decade without anyone noticing.
   */
  it("agrees with the platform on a few hundred real dates", () => {
    const start = new Date(2019, 0, 1);
    for (let i = 0; i < 400; i += 1) {
      const probe = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * 3);
      expect(dayOfWeek(toCivilDate(probe)), probe.toDateString()).toBe(probe.getDay());
    }
  });

  it("is right across a leap day and a century boundary", () => {
    expect(dayOfWeek(d(2024, 2, 29))).toBe(4); // Thursday
    expect(dayOfWeek(d(2000, 1, 1))).toBe(6); // Saturday
    expect(dayOfWeek(d(1900, 1, 1))).toBe(1); // Monday
  });
});

describe("day arithmetic", () => {
  it("crosses month and year boundaries in both directions", () => {
    expect(addDays(d(2024, 1, 31), 1)).toEqual(d(2024, 2, 1));
    expect(addDays(d(2024, 12, 31), 1)).toEqual(d(2025, 1, 1));
    expect(addDays(d(2025, 1, 1), -1)).toEqual(d(2024, 12, 31));
    expect(addDays(d(2024, 3, 1), -1)).toEqual(d(2024, 2, 29));
    expect(addDays(d(2023, 3, 1), -1)).toEqual(d(2023, 2, 28));
  });

  it("survives a jump longer than a month", () => {
    expect(addDays(d(2024, 1, 1), 365)).toEqual(d(2024, 12, 31)); // leap year
    expect(addDays(d(2023, 1, 1), 365)).toEqual(d(2024, 1, 1));
  });

  /**
   * The reason there is no `Date` in this module: on the two days a year a
   * timezone shifts, adding 86,400,000ms is not adding a day. This walks a
   * whole year one day at a time and checks nothing repeats or vanishes.
   */
  it("never repeats or skips a day across a full year", () => {
    let cursor = d(2024, 1, 1);
    const seen = new Set<string>();
    for (let i = 0; i < 366; i += 1) {
      const key = `${cursor.year}-${cursor.month}-${cursor.day}`;
      expect(seen.has(key), `${key} appeared twice`).toBe(false);
      seen.add(key);
      cursor = addDays(cursor, 1);
    }
    expect(seen.size).toBe(366);
    expect(cursor).toEqual(d(2025, 1, 1));
  });
});

describe("month arithmetic", () => {
  it("clamps rather than overflowing, which is what a calendar means by next month", () => {
    expect(addMonths(d(2024, 1, 31), 1)).toEqual(d(2024, 2, 29));
    expect(addMonths(d(2023, 1, 31), 1)).toEqual(d(2023, 2, 28));
    expect(addMonths(d(2024, 3, 31), -1)).toEqual(d(2024, 2, 29));
  });

  it("crosses years in both directions", () => {
    expect(addMonths(d(2024, 12, 15), 1)).toEqual(d(2025, 1, 15));
    expect(addMonths(d(2024, 1, 15), -1)).toEqual(d(2023, 12, 15));
    expect(addMonths(d(2024, 6, 15), -18)).toEqual(d(2022, 12, 15));
  });
});

describe("the month grid", () => {
  it("is always six weeks, so nothing under it jumps as you page", () => {
    for (const [year, month] of [[2024, 2], [2024, 9], [2021, 8], [2026, 3]]) {
      const grid = monthGrid(year, month);
      expect(grid).toHaveLength(WEEKS_IN_GRID);
      expect(grid.every((w) => w.length === 7)).toBe(true);
    }
  });

  it("starts on the configured weekday", () => {
    const monday = monthGrid(2024, 5, { weekStartsOn: 1 });
    expect(dayOfWeek(monday[0][0].date)).toBe(1);
    const sunday = monthGrid(2024, 5, { weekStartsOn: 0 });
    expect(dayOfWeek(sunday[0][0].date)).toBe(0);
    expect(weekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it("contains every day of the month exactly once", () => {
    const grid = monthGrid(2024, 2).flat().filter((c) => c.inMonth);
    expect(grid).toHaveLength(29);
    expect(new Set(grid.map((c) => c.date.day)).size).toBe(29);
  });

  it("borrows the neighbouring months for the edges and marks them", () => {
    const cells = monthGrid(2024, 5, { weekStartsOn: 1 }).flat();
    const borrowed = cells.filter((c) => !c.inMonth);
    expect(borrowed.length).toBeGreaterThan(0);
    expect(borrowed.every((c) => c.date.month !== 5)).toBe(true);
  });

  it("marks today, the selection, and anything out of bounds", () => {
    const cells = monthGrid(2024, 5, {
      today: d(2024, 5, 9),
      selected: d(2024, 5, 14),
      min: d(2024, 5, 5),
      max: d(2024, 5, 20),
    }).flat();

    expect(cells.filter((c) => c.isToday)).toHaveLength(1);
    expect(cells.filter((c) => c.selected)).toHaveLength(1);
    expect(cells.find((c) => isSameDay(c.date, d(2024, 5, 4)))!.disabled).toBe(true);
    expect(cells.find((c) => isSameDay(c.date, d(2024, 5, 5)))!.disabled).toBe(false);
    expect(cells.find((c) => isSameDay(c.date, d(2024, 5, 21)))!.disabled).toBe(true);
  });

  it("separates a range's endpoints from its middle", () => {
    const cells = monthGrid(2024, 5, {
      range: { start: d(2024, 5, 10), end: d(2024, 5, 14) },
    }).flat();

    const start = cells.find((c) => isSameDay(c.date, d(2024, 5, 10)))!;
    const middle = cells.find((c) => isSameDay(c.date, d(2024, 5, 12)))!;
    const end = cells.find((c) => isSameDay(c.date, d(2024, 5, 14)))!;

    expect([start.rangeStart, start.inRange, start.selected]).toEqual([true, false, true]);
    expect([middle.rangeStart, middle.inRange, middle.selected]).toEqual([false, true, false]);
    expect([end.rangeEnd, end.inRange, end.selected]).toEqual([true, false, true]);
  });

  it("takes a custom disabled predicate, for weekends and holidays", () => {
    const cells = monthGrid(2024, 5, {
      isDisabled: (date) => dayOfWeek(date) === 0 || dayOfWeek(date) === 6,
    }).flat();
    expect(cells.filter((c) => c.disabled).every((c) => [0, 6].includes(dayOfWeek(c.date)))).toBe(true);
  });
});

describe("keyboard movement", () => {
  it("moves by day, week and month", () => {
    expect(moveFocus(d(2024, 5, 15), "ArrowRight")).toEqual(d(2024, 5, 16));
    expect(moveFocus(d(2024, 5, 15), "ArrowDown")).toEqual(d(2024, 5, 22));
    expect(moveFocus(d(2024, 5, 15), "PageUp")).toEqual(d(2024, 4, 15));
  });

  it("goes to the ends of the week, not the month", () => {
    // 15 May 2024 is a Wednesday.
    expect(moveFocus(d(2024, 5, 15), "Home")).toEqual(d(2024, 5, 13));
    expect(moveFocus(d(2024, 5, 15), "End")).toEqual(d(2024, 5, 19));
  });

  it("lets a key it does not own through, so Tab still leaves", () => {
    expect(moveFocus(d(2024, 5, 15), "Tab")).toBeNull();
    expect(moveFocus(d(2024, 5, 15), "a")).toBeNull();
  });
});

describe("time", () => {
  it("covers the clock exactly once at any step that divides it", () => {
    expect(timeOptions(15)).toHaveLength(96);
    expect(timeOptions(30)).toHaveLength(48);
    expect(timeOptions(60)).toHaveLength(24);
    const all = timeOptions(15);
    const last = all[all.length - 1];
    expect(last).toEqual({ hour: 23, minute: 45 });
  });

  it("refuses a step that would not land on midnight", () => {
    expect(() => timeOptions(7)).toThrow(/divide 1440/);
    expect(() => timeOptions(0)).toThrow();
  });

  it("formats without changing the value it holds", () => {
    expect(formatTime({ hour: 14, minute: 5 })).toBe("14:05");
    expect(formatTime({ hour: 14, minute: 5 }, true)).toBe("2:05 pm");
    // Midnight and noon are the two the 12-hour clock gets wrong.
    expect(formatTime({ hour: 0, minute: 0 }, true)).toBe("12:00 am");
    expect(formatTime({ hour: 12, minute: 0 }, true)).toBe("12:00 pm");
  });
});

describe("ordering", () => {
  it("sorts correctly across all three fields", () => {
    const dates = [d(2024, 5, 2), d(2023, 12, 31), d(2024, 5, 1), d(2024, 4, 30)];
    expect([...dates].sort(compareDates)).toEqual([
      d(2023, 12, 31), d(2024, 4, 30), d(2024, 5, 1), d(2024, 5, 2),
    ]);
  });
});
