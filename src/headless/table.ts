/**
 * Table sorting.
 *
 * Small, and here rather than in a component for one reason: the *cycle* is a
 * decision, and two renderers making it separately will disagree about what
 * happens on the third press.
 */

export type SortDirection = "ascending" | "descending";

export interface SortState {
  key: string;
  direction: SortDirection;
}

/**
 * What the next press on a header does.
 *
 * Three states, not two: ascending, descending, and **back to unsorted**. The
 * two-state cycle is more common and is worse — once a reader has sorted a
 * table there is no way back to the order it arrived in, and that original
 * order is frequently the meaningful one (a feed is chronological, a playlist
 * is a sequence, a result set is ranked by relevance).
 *
 * A first press on a new column always starts ascending, whatever the old
 * column was doing.
 */
export function nextSort(current: SortState | null, key: string): SortState | null {
  if (!current || current.key !== key) return { key, direction: "ascending" };
  if (current.direction === "ascending") return { key, direction: "descending" };
  return null;
}

/** What a header should report to assistive technology. */
export function ariaSort(current: SortState | null, key: string): SortDirection | "none" {
  return current?.key === key ? current.direction : "none";
}

/**
 * Sort rows by a value the caller extracts.
 *
 * Stable, because an unstable sort makes equal rows shuffle every time the
 * table re-renders, which looks like data changing. `Array.prototype.sort` is
 * specified stable in modern engines, and this relies on that rather than
 * decorating with an index.
 *
 * Nullish values sort last in both directions. They are absent rather than
 * small, and "no value" belonging at the top of a descending sort is an answer
 * nobody wants.
 */
export function sortRows<Row>(
  rows: Row[],
  sort: SortState | null,
  valueOf: (row: Row, key: string) => string | number | null | undefined,
): Row[] {
  if (!sort) return rows;
  const factor = sort.direction === "ascending" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = valueOf(a, sort.key);
    const right = valueOf(b, sort.key);

    const leftMissing = left === null || left === undefined || left === "";
    const rightMissing = right === null || right === undefined || right === "";
    if (leftMissing && rightMissing) return 0;
    if (leftMissing) return 1;
    if (rightMissing) return -1;

    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * factor;
    }
    // Locale-aware, and numeric so "Item 10" sorts after "Item 9" rather than
    // between "Item 1" and "Item 2".
    return String(left).localeCompare(String(right), undefined, { numeric: true }) * factor;
  });
}
