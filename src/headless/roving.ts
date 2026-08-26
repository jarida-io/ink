/**
 * Roving focus — the keyboard behaviour every tab list, radio group and toolbar
 * needs, written once instead of three times.
 *
 * A group of eleven options that costs eleven tab stops is a group nobody
 * reaches the end of with a keyboard. The fix is always the same: one stop for
 * the group, arrows to move inside it, Home and End for the ends, and disabled
 * options skipped rather than focused and refused.
 *
 * Pure. It takes an index and a key and returns an index.
 */

export interface RovingOptions {
  /** Which entries cannot be reached. */
  disabled?: boolean[];
  /** Wrap past the ends. False stops, which suits a toolbar more than a list. */
  wrap?: boolean;
  /** `vertical` swaps which arrows move. `both` accepts either. */
  orientation?: "horizontal" | "vertical" | "both";
}

const NEXT_KEYS = { horizontal: ["ArrowRight"], vertical: ["ArrowDown"], both: ["ArrowRight", "ArrowDown"] };
const PREV_KEYS = { horizontal: ["ArrowLeft"], vertical: ["ArrowUp"], both: ["ArrowLeft", "ArrowUp"] };

/** Returns the next index, or null when the key is not ours to handle. */
export function rove(
  key: string,
  current: number,
  count: number,
  options: RovingOptions = {},
): number | null {
  const { disabled = [], wrap = true, orientation = "both" } = options;
  if (count === 0) return null;

  const reachable = (i: number) => !disabled[i];
  const anyReachable = Array.from({ length: count }, (_, i) => i).some(reachable);
  if (!anyReachable) return null;

  const step = (from: number, direction: 1 | -1): number | null => {
    let index = from;
    for (let taken = 0; taken < count; taken += 1) {
      index += direction;
      if (index >= count) {
        if (!wrap) return null;
        index = 0;
      }
      if (index < 0) {
        if (!wrap) return null;
        index = count - 1;
      }
      if (reachable(index)) return index;
    }
    return null;
  };

  const edge = (direction: 1 | -1): number | null => {
    const start = direction === 1 ? 0 : count - 1;
    if (reachable(start)) return start;
    return step(start, direction);
  };

  if (NEXT_KEYS[orientation].includes(key)) return step(current, 1);
  if (PREV_KEYS[orientation].includes(key)) return step(current, -1);
  if (key === "Home") return edge(1);
  if (key === "End") return edge(-1);
  return null;
}

/** The keys `rove` will act on, for a host deciding whether to preventDefault. */
export function isRovingKey(key: string, orientation: RovingOptions["orientation"] = "both"): boolean {
  return (
    NEXT_KEYS[orientation].includes(key) ||
    PREV_KEYS[orientation].includes(key) ||
    key === "Home" ||
    key === "End"
  );
}
