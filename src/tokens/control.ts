/**
 * Control geometry — height, padding, radius and border, derived rather than
 * picked.
 *
 * ## What this replaces
 *
 * Before this file the library's controls carried values that had each been
 * chosen once, in isolation, and never compared: a tile at `10px 13px`, a pill
 * at `7px 15px`, a button at `0 20px`, an input at `0 12px`, a badge at
 * `2px 8px`. None of them is wrong on its own. Together they are five different
 * relationships between a control's height and its side padding, which is why a
 * pill next to a button next to an input never quite lines up.
 *
 * ## The relationship
 *
 * Side padding is a function of height:
 *
 *     padX = round(height * 0.36) snapped to the 4px grid
 *
 * That is not a magic constant — it is the ratio the three sizes below already
 * wanted, and writing it down means a fourth size cannot drift:
 *
 *     32 -> 12    44 -> 16    52 -> 20
 *
 * A **pill** takes one step more, because a fully rounded corner eats side
 * room: at a 999px radius the usable width at the text's baseline is narrower
 * than the box, and a pill padded like a rectangle reads as cramped.
 *
 * Vertical padding is only used by controls that stack their content (a tile
 * with a name and a fact). It is one step *below* the horizontal, which is what
 * keeps a two-line tile from turning into a square.
 *
 * ## Two border widths, not three
 *
 * The library used to have 1px, 1.5px and 2px. The 1.5 is gone, and its absence
 * is the point: a fractional pixel resolves differently in every engine at 1x —
 * some round it to 1, some to 2, some antialias it into a grey smear — so a
 * hairline drawn at 1.5 is the one value in a design system that is not the
 * same on two machines. Two widths, both integers, both exact everywhere:
 *
 * - `hairline` (1) separates. Dividers, table rules, row separators, and the
 *   outline of a control that is not currently chosen.
 * - `ink` (2) is structural. The edge, and anything that carries it.
 *
 * If a design wants "slightly heavier than a hairline", the answer is a darker
 * hairline, not a thicker one. Colour is continuous; device pixels are not.
 */
import { RADIUS, SPACE, TOUCH } from "./space.js";

export type ControlSize = "sm" | "md" | "lg";

/**
 * Heights.
 *
 * `md` is the touch floor, and it is the default for a reason: a control that
 * has to be justified is a control below it, not one at it.
 */
export const CONTROL_HEIGHT: Record<ControlSize, number> = {
  sm: 32,
  md: TOUCH.tapMin,
  lg: 52,
};

/** The ratio side padding is derived from. See the note above. */
export const PAD_RATIO = 0.36;

/** Snap to the 4px grid, so a derived value is still a scale value. */
function toGrid(value: number): number {
  return Math.round(value / 4) * 4;
}

export function controlPadX(size: ControlSize, shape: "box" | "pill" = "box"): number {
  const base = toGrid(CONTROL_HEIGHT[size] * PAD_RATIO);
  return shape === "pill" ? base + 4 : base;
}

/** Only for controls that stack content. One step below the horizontal. */
export function controlPadY(size: ControlSize): number {
  return Math.max(SPACE[1], toGrid(controlPadX(size) - 4));
}

/**
 * Icon size, derived from the control the icon sits in.
 *
 *     iconSize = round(height * 0.45) snapped to the 4px grid
 *     32 -> 16    44 -> 20    52 -> 24
 *
 * The same move as `PAD_RATIO`, for the same reason: a table of three numbers
 * is a table someone adds a fourth row to by eye.
 *
 * The ratio is picked so `lg` lands exactly on 24, the grid every lucide icon
 * is drawn on. At 24 the artwork is 1:1 and its 2px stroke is 2 device pixels —
 * the one size where the drawing is untouched.
 */
export const ICON_RATIO = 0.45;

export function controlIconSize(size: ControlSize): number {
  return toGrid(CONTROL_HEIGHT[size] * ICON_RATIO);
}

/** The weight an icon's line should carry, in device pixels, at any size. */
export const ICON_STROKE = 2;

/**
 * The stroke to ask for so a scaled icon keeps that weight.
 *
 * An icon drawn on a 24px grid with a 2px stroke and rendered at 16px is not a
 * smaller icon, it is a *lighter* one: the stroke scales with everything else
 * and lands at 1.33px. Beside a 20px icon at 1.67px and a 24px icon at 2px, one
 * row of controls carries three different line weights, which reads the way
 * three different font weights would.
 *
 * The fix is to ask for a stroke in the icon's own coordinate space that
 * *renders* as the weight we want:
 *
 *     strokeInViewBox = desired * 24 / renderedSize
 *
 * which is what lucide's `absoluteStrokeWidth` computes, identically in both of
 * its packages. Ink computes it rather than setting the flag, because the house
 * set is data and data has no flag to set — and because a registered component
 * and a house glyph must come out at the same weight or the mixture shows.
 */
export function iconStrokeWidth(renderedSize: number, desired: number = ICON_STROKE): number {
  if (renderedSize <= 0) return desired;
  return (desired * 24) / renderedSize;
}

/**
 * Radius follows height, so a 32px control does not wear a 14px corner.
 *
 * Roughly a quarter of the height, snapped to the radius scale rather than
 * computed freely — a design system with continuous corners has no corners.
 */
export const CONTROL_RADIUS: Record<ControlSize, number> = {
  sm: RADIUS.sm,
  md: RADIUS.md,
  lg: RADIUS.md,
};

export const BORDER = {
  /** Separates. Exactly one device pixel at 1x, in every engine. */
  hairline: 1,
  /** Structural. The edge, and anything carrying it. */
  ink: 2,
} as const;

export type BorderWidth = keyof typeof BORDER;

/**
 * Container padding — a card, a panel, a sheet.
 *
 * Deliberately coarser than control padding and on its own scale, because a
 * container's padding is about the space around a group and a control's is
 * about the space around a word. Tying them together makes cards feel tight at
 * exactly the point controls feel right.
 */
export const CONTAINER_PAD: Record<ControlSize, number> = {
  sm: SPACE[3],
  md: SPACE[4],
  lg: SPACE[6],
};

export interface ControlMetrics {
  height: number;
  padX: number;
  padY: number;
  radius: number;
  gap: number;
}

export function controlMetrics(
  size: ControlSize = "md",
  shape: "box" | "pill" = "box",
): ControlMetrics {
  return {
    height: CONTROL_HEIGHT[size],
    padX: controlPadX(size, shape),
    padY: controlPadY(size),
    radius: shape === "pill" ? RADIUS.pill : CONTROL_RADIUS[size],
    // The space between an icon and its label. Half the side padding, which
    // keeps a leading icon looking attached to the word rather than to the edge.
    gap: Math.max(SPACE[1], toGrid(controlPadX(size) / 2)),
  };
}
