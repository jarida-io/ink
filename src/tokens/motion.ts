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

/**
 * A spring, in the two numbers a designer can reason about rather than the
 * three a physics engine wants. `damping` is the ratio: 1 settles without
 * overshoot, lower bounces. `response` is roughly how long it takes to get
 * there, in seconds — not a duration, because a spring has none.
 */
export interface InkSpring {
  damping: number;
  response: number;
}

export const SPRING = {
  /** Almost everything: arrives, and does not wobble on the way. */
  default: { damping: 1, response: 0.35 },
  /** Small controls — a switch knob, a thumb — where 350ms reads as lag. */
  snappy: { damping: 1, response: 0.24 },
  /** Only after a gesture that carried momentum. A flick earns the overshoot. */
  momentum: { damping: 0.82, response: 0.35 },
} as const satisfies Record<string, InkSpring>;

/** Stiffness and damping for an engine that takes mass 1, as React Native's does. */
export function springPhysics(spring: InkSpring): { stiffness: number; damping: number; mass: 1 } {
  const omega = (2 * Math.PI) / spring.response;
  return { stiffness: omega * omega, damping: 2 * spring.damping * omega, mass: 1 };
}

/**
 * Where a release at `velocity` (px/s) would come to rest, the way a scroll
 * decelerates. Snap to the target nearest this, not nearest the finger.
 */
export function projectMomentum(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Resistance past a bound: the further over, the less it follows. A hard stop
 * reads as frozen; this reads as "nothing more here".
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
