/**
 * Space, radius, and the two numbers that decide whether a finger can use this.
 */

/** The 8pt grid, with a 4px half-step for the places that genuinely need it. */
export const SPACE = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export type SpaceStep = keyof typeof SPACE;

export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  "2xl": 28,
  /** Anything that should read as a pill. Native clamps this; see `core/edge.ts`. */
  pill: 999,
} as const;

export type RadiusName = keyof typeof RADIUS;

/**
 * Touch.
 *
 * `tapMin` (44) is the hit-area floor for anything a finger drives — the Apple
 * HIG minimum, which Material's 48dp also clears.
 *
 * It is deliberately not the same as visual size. The dense surface's whole
 * advantage is density: ten filter pills in a row, a full model grid. Inflating
 * every control to 44 would cost the only reason that surface exists. So chrome
 * grows *visually* to `tapMin`, and dense data controls keep `tapDense` and
 * reach `tapMin` through an invisible extension — vertically only, because
 * growing sideways makes neighbouring pills steal each other's taps. See
 * `core/reach.ts`, which is the same idea on both platforms and happens to map
 * exactly onto React Native's per-side `hitSlop`.
 */
export const TOUCH = {
  tapMin: 44,
  tapDense: 36,
} as const;

export const ROW_HEIGHT = {
  sm: 36,
  md: 44,
  lg: 52,
} as const;

/** Long-form measure. Web can say `62ch`; native cannot, so this is px at 13px body. */
export const MEASURE = {
  /** Roughly 62ch of Quicksand at 13px — the cap on a description. */
  prose: 460,
  /** Roughly 46ch — the cap on a lead sentence. */
  lead: 360,
  /** The reading column. */
  content: 760,
} as const;
