/**
 * Motion.
 *
 * One easing curve does almost all the work, and the durations are short
 * because the edge is a physical affordance rather than a flourish: a key that
 * takes 300ms to go down does not read as a key.
 *
 * Reduced motion does not remove the lift. The lift *is* the pressed state, so
 * deleting it would leave a control with no feedback at all. It collapses to
 * `instant` instead — the geometry still changes, it just stops being eased.
 * That is what the shipped stylesheet does and it is the right reading of the
 * preference.
 */

export const DURATION = {
  instant: 1,
  fast: 120,
  base: 200,
  /** The lift. Slightly longer than `fast` so the travel is legible. */
  lift: 160,
  slow: 320,
} as const;

export type DurationName = keyof typeof DURATION;

/**
 * A single out-easing curve, as four control points so it can be handed to
 * either a CSS `cubic-bezier()` or React Native's `Easing.bezier()`.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export type Bezier = readonly [number, number, number, number];

export function cssBezier(b: Bezier): string {
  return `cubic-bezier(${b.join(", ")})`;
}
