/**
 * Which page numbers to show.
 *
 * The only genuinely fiddly part of pagination, and the part every
 * implementation gets subtly wrong: the window has to stay a **constant width**
 * as it moves, or the controls shuffle under the reader's cursor between
 * clicks. Naively clamping `[page - k, page + k]` to the range collapses the
 * window at both ends — page 1 of 20 shows three numbers where page 10 shows
 * five, and the "next" button moves.
 */

/** A page number, or a gap standing for the pages that did not fit. */
export type PageSlot = number | "gap";

export interface PaginationOptions {
  /** Total slots including the first, last and any gaps. Minimum 5. */
  max?: number;
  /** Always show the first and last page, with gaps between. */
  boundaries?: boolean;
}

export function pageSlots(
  page: number,
  count: number,
  options: PaginationOptions = {},
): PageSlot[] {
  const max = Math.max(5, options.max ?? 7);
  const boundaries = options.boundaries ?? true;

  if (count <= max) {
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  const current = Math.min(Math.max(1, page), count);

  if (!boundaries) {
    // A plain sliding window, still constant width.
    const half = Math.floor(max / 2);
    const start = Math.min(Math.max(1, current - half), count - max + 1);
    return Array.from({ length: max }, (_, i) => start + i);
  }

  // First, last, and up to two gaps — so the window between them is
  // `max - 4` wide and stays that wide wherever the page is.
  const window = max - 4;
  const half = Math.floor(window / 2);

  let start = current - half;
  let end = current + (window - half - 1);

  if (start <= 2) {
    // Near the beginning there is no leading gap, so the window inherits that
    // one slot — one, not two. Taking two is how the control ends up a page
    // wider at the ends than in the middle, which is the bug this whole
    // function exists to avoid.
    start = 2;
    end = start + window;
  } else if (end >= count - 1) {
    end = count - 1;
    start = end - window;
  }

  start = Math.max(2, start);
  end = Math.min(count - 1, end);

  const slots: PageSlot[] = [1];
  if (start > 2) slots.push("gap");
  for (let i = start; i <= end; i += 1) slots.push(i);
  if (end < count - 1) slots.push("gap");
  slots.push(count);
  return slots;
}

/** Total pages for a row count. Zero rows is one (empty) page, not zero. */
export function pageCount(total: number, perPage: number): number {
  if (perPage <= 0) throw new Error("ink: perPage must be positive");
  return Math.max(1, Math.ceil(total / perPage));
}

/** The slice of a list a page covers, as a half-open range. */
export function pageRange(page: number, perPage: number, total: number) {
  const start = Math.min((page - 1) * perPage, Math.max(0, total));
  return { start, end: Math.min(start + perPage, total) };
}
