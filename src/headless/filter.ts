/**
 * Matching text against a list — for an autocomplete, a search box, a command
 * list.
 *
 * Two decisions worth making once rather than per-component.
 *
 * **Prefix beats contains.** Typing "se" should offer "Settings" before
 * "Voice sensitivity". Both match; only one is what the reader is typing. A
 * plain `includes` filter ranks them by array order, which is why so many
 * autocompletes feel like they are ignoring you.
 *
 * **Accents and case are not the reader's problem.** "Jose" should find "José".
 * `localeCompare` cannot do partial matching, so this normalises with NFD and
 * strips the combining marks.
 */

export interface Match<T> {
  item: T;
  /** Lower is better. 0 is an exact match. */
  score: number;
  /** Where the query landed, for highlighting. Empty when the query is empty. */
  ranges: [number, number][];
}

/** Case-folded and accent-stripped, so "cafe" finds "Café". */
export function normalise(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Rank items against a query.
 *
 * Scoring, best first: exact (0), starts-with (1), a word starts with it (2),
 * contains (3). Ties keep their original order, because a stable result is what
 * stops the list reshuffling as someone types a character and deletes it again.
 */
export function filterItems<T>(
  items: T[],
  query: string,
  labelOf: (item: T) => string,
  limit = Infinity,
): Match<T>[] {
  const q = normalise(query.trim());
  if (!q) {
    return items.slice(0, limit === Infinity ? undefined : limit).map((item) => ({
      item,
      score: 0,
      ranges: [],
    }));
  }

  const out: Match<T>[] = [];
  for (const item of items) {
    const label = labelOf(item);
    const hay = normalise(label);
    const at = hay.indexOf(q);
    if (at === -1) continue;

    let score: number;
    if (hay === q) score = 0;
    else if (at === 0) score = 1;
    else if (/\s|[-_/]/.test(hay[at - 1] ?? "")) score = 2;
    else score = 3;

    out.push({ item, score, ranges: [[at, at + q.length]] });
  }

  // Stable: `Array.prototype.sort` is specified stable, so equal scores keep
  // the order they were given in.
  out.sort((a, b) => a.score - b.score);
  return limit === Infinity ? out : out.slice(0, limit);
}

/** Split a label into matched and unmatched runs, for highlighting. */
export function highlight(label: string, ranges: [number, number][]) {
  if (ranges.length === 0) return [{ text: label, match: false }];
  const parts: { text: string; match: boolean }[] = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) parts.push({ text: label.slice(at, start), match: false });
    parts.push({ text: label.slice(start, end), match: true });
    at = end;
  }
  if (at < label.length) parts.push({ text: label.slice(at), match: false });
  return parts;
}
