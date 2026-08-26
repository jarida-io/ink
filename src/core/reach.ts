/**
 * Touch the chrome, not the data.
 *
 * Visual size and hit size are different things, and conflating them is how a
 * dense view gets inflated until it is a worse version of the touch view.
 * Chrome — navigation, primary actions — grows visually to the 44px floor.
 * Dense controls keep their compact look and gain the hit area invisibly.
 *
 * The expansion is vertical only. Growing it sideways makes adjacent pills in a
 * row overlap each other's targets, so taps near a boundary land on the wrong
 * control — worse than a small target, because it is wrong rather than fiddly.
 * A row of pills has no vertical neighbours, so vertical growth is free.
 *
 * That rule happens to map exactly onto React Native's `hitSlop`, which takes a
 * per-side object. The same sentence describes both platforms, which is the
 * best evidence available that it was the right rule.
 */
import { TOUCH } from "../tokens/space.js";

export interface Reach {
  /** Extra hit area above and below, in px. Zero when none is needed. */
  vertical: number;
  /** Always zero. Named rather than omitted so the intent survives a refactor. */
  horizontal: 0;
}

export function reachFor(visualHeight: number, floor: number = TOUCH.tapMin): Reach {
  const missing = Math.max(0, floor - visualHeight);
  return { vertical: Math.ceil(missing / 2), horizontal: 0 };
}

/** React Native's shape. Feed it straight to `hitSlop`. */
export function hitSlop(visualHeight: number, floor: number = TOUCH.tapMin) {
  const reach = reachFor(visualHeight, floor);
  return { top: reach.vertical, bottom: reach.vertical, left: 0, right: 0 };
}

/**
 * The web's shape: the geometry of the `::after` that receives the pointer.
 *
 * Returns null when the control is already tall enough, so the caller can skip
 * the pseudo-element entirely rather than paint an invisible one over
 * everything.
 */
export function reachBox(visualHeight: number, floor: number = TOUCH.tapMin) {
  if (visualHeight >= floor) return null;
  return { left: 0, right: 0, top: "50%", translateY: "-50%", height: floor } as const;
}
