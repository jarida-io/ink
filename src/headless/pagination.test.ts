import { describe, expect, it } from "vitest";
import { pageCount, pageRange, pageSlots } from "./pagination.js";

const width = (slots: unknown[]) => slots.length;

describe("page slots", () => {
  it("shows every page while they fit", () => {
    expect(pageSlots(1, 5, { max: 7 })).toEqual([1, 2, 3, 4, 5]);
  });

  /**
   * The property every implementation gets wrong. If the window narrows at the
   * ends, the "next" button moves between clicks and the reader chases it.
   */
  it("keeps a constant width wherever the page is", () => {
    const widths = new Set<number>();
    for (let page = 1; page <= 40; page += 1) {
      widths.add(width(pageSlots(page, 40, { max: 7 })));
    }
    expect([...widths], "the control changes width as you page").toEqual([7]);
  });

  it("holds the first and last page, with gaps for what did not fit", () => {
    const middle = pageSlots(20, 40, { max: 7 });
    expect(middle[0]).toBe(1);
    expect(middle[middle.length - 1]).toBe(40);
    expect(middle.filter((s) => s === "gap")).toHaveLength(2);
    expect(middle).toContain(20);
  });

  it("drops the leading gap near the beginning and the trailing one near the end", () => {
    const first = pageSlots(1, 40, { max: 7 });
    expect(first.filter((s) => s === "gap")).toHaveLength(1);
    expect(first.slice(0, 2)).toEqual([1, 2]);

    const last = pageSlots(40, 40, { max: 7 });
    expect(last.filter((s) => s === "gap")).toHaveLength(1);
    expect(last.slice(-2)).toEqual([39, 40]);
  });

  it("always contains the current page", () => {
    for (let page = 1; page <= 40; page += 1) {
      expect(pageSlots(page, 40, { max: 7 }), `page ${page}`).toContain(page);
    }
  });

  it("never repeats a page or goes out of order", () => {
    for (let page = 1; page <= 40; page += 1) {
      const numbers = pageSlots(page, 40).filter((s): s is number => s !== "gap");
      expect(new Set(numbers).size).toBe(numbers.length);
      expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
    }
  });

  it("clamps a page outside the range rather than producing nonsense", () => {
    expect(pageSlots(0, 10, { max: 7 })).toContain(1);
    expect(pageSlots(99, 10, { max: 7 })).toContain(10);
  });

  it("slides plainly when boundaries are off", () => {
    const slots = pageSlots(20, 40, { max: 5, boundaries: false });
    expect(slots).toEqual([18, 19, 20, 21, 22]);
    expect(slots.includes("gap")).toBe(false);
  });

  it("refuses to be narrower than five, which cannot hold two gaps and a page", () => {
    expect(width(pageSlots(20, 40, { max: 2 }))).toBe(5);
  });
});

describe("counting", () => {
  it("treats an empty list as one page, not zero", () => {
    // Zero pages means the control renders nothing and the reader sees a table
    // with no explanation of why it is empty.
    expect(pageCount(0, 10)).toBe(1);
  });

  it("rounds up a partial page", () => {
    expect(pageCount(21, 10)).toBe(3);
    expect(pageCount(20, 10)).toBe(2);
  });

  it("refuses a nonsensical page size", () => {
    expect(() => pageCount(10, 0)).toThrow(/positive/);
  });

  it("gives a half-open range that never runs past the end", () => {
    expect(pageRange(1, 10, 25)).toEqual({ start: 0, end: 10 });
    expect(pageRange(3, 10, 25)).toEqual({ start: 20, end: 25 });
    expect(pageRange(9, 10, 25).end).toBe(25);
  });
});
