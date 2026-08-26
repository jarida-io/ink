/**
 * The ink edge.
 *
 * This file is the reason the library exists. Everything else here is a palette
 * and a grid; this is the one thing that makes a screen recognisably ours, and
 * it is the one thing that does not survive a naive port.
 *
 * ## What it is
 *
 * A 2px charcoal border, and a hard-offset plate of `palette.ink` sitting 4px
 * down and to the right. No blur, no spread, no alpha. It is a printed edge,
 * not a shadow.
 *
 * ## What it means
 *
 * Elevation is the only channel that says *chosen*. A selected voice rises on
 * its offset; every unselected one lies flat with a hairline. Colour never
 * means selected — spending the page's one real colour on decoration leaves
 * nothing for the control that is actually asking a question.
 *
 * Two consequences the API enforces rather than documents:
 *
 * - No component in this library takes a `color` prop. Tone comes from a closed
 *   semantic set, so you have to name the meaning before you can have the hue.
 * - `InkBudget` counts edges in a subtree and complains past two. Three levels
 *   of the same treatment is how a signal stops being one.
 *
 * ## The physics, and why the plate never moves
 *
 * The shipped stylesheet writes it as a shadow whose offset changes and a
 * transform that compensates:
 *
 *     box-shadow: var(--ink-lift) var(--ink-lift) 0 var(--border-ink);
 *     transform:  translate(calc(4px - var(--ink-lift)), calc(4px - var(--ink-lift)));
 *
 * Work that through and something useful falls out. A box-shadow is drawn
 * relative to the box, so at rest the face sits at 0 with its plate at +4; at
 * `raised` the face moves to -3 and the plate to -3+7 = +4; at `pressed` the
 * face moves to +4 and the plate to +4+0 = +4. **The plate is at +4 in all
 * three states.** It never moves. Only the face does.
 *
 * That is the physical reading — a sheet of paper lifting off a printed mark
 * and being pressed back down onto it — and it is also what makes the edge
 * portable, because "a static plate behind a moving face" is two views, and
 * two views exist everywhere. A hard offset shadow does not.
 *
 * ## What each platform does with that
 *
 * - **Web** keeps the shadow form, because it is what ships today and it costs
 *   no extra element. `--ink-lift` keeps its name so the library and the
 *   existing stylesheets are describing the same number.
 * - **Native** draws the plate as an absolutely positioned sibling. Not because
 *   React Native cannot do `boxShadow` — recent versions can — but because the
 *   plate is the honest model, it renders identically on every RN version and
 *   on Android's older clipping behaviour, and it lets the edge reserve its own
 *   4px in layout instead of overlapping the neighbour.
 */

/** The rungs. `raised` is pointer-only; a finger has no hover. */
export type InkState = "rest" | "raised" | "pressed";

export interface InkEdgeTokens {
  /** Where the plate sits, and the only offset that is ever real. */
  rest: number;
  /** Toward the light. Pointer surfaces only. */
  raised: number;
  /** Down onto the plate. */
  pressed: number;
  /** The border. 2px, not a hairline — it has to stay visible on a dim panel. */
  borderWidth: number;
  /** The hairline everything unchosen wears. */
  hairlineWidth: number;
}

export const EDGE: InkEdgeTokens = {
  rest: 4,
  raised: 7,
  pressed: 0,
  borderWidth: 2,
  hairlineWidth: 1.5,
};

/**
 * A smaller ladder for controls that are already small.
 *
 * The shipped voice picker presses its chips to a 2px offset rather than 0,
 * and it is right to: a 30px chip that travels the full 4px reads as falling
 * over rather than being pressed. Same physics, shorter throw.
 */
export const EDGE_COMPACT: InkEdgeTokens = {
  rest: 4,
  raised: 4,
  pressed: 2,
  borderWidth: 2,
  hairlineWidth: 1.5,
};

/** How far the *face* has moved from where it rests, in px on both axes. */
export function faceShift(state: InkState, edge: InkEdgeTokens = EDGE): number {
  return edge.rest - edge[state];
}

/** The gap between face and plate in a given state. Web writes this as a shadow. */
export function edgeOffset(state: InkState, edge: InkEdgeTokens = EDGE): number {
  return edge[state];
}
