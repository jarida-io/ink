/**
 * The edge, resolved into geometry both renderers can build from.
 *
 * The argument for why the plate is static and the face is what moves lives in
 * `tokens/edge.ts`. This is the arithmetic that follows from it.
 */
import {
  EDGE,
  faceShift,
  type InkEdgeTokens,
  type InkState,
} from "../tokens/edge.js";
import { RADIUS } from "../tokens/space.js";

export interface EdgeGeometry {
  /** Gap between face and plate. Web writes this as the shadow offset. */
  offset: number;
  /** How far the face has moved from rest, on both axes. */
  shift: number;
  /** Where the plate sits. Constant across every state — that is the point. */
  plate: number;
  borderWidth: number;
}

export function resolveEdge(
  state: InkState,
  edge: InkEdgeTokens = EDGE,
): EdgeGeometry {
  return {
    offset: edge[state],
    shift: faceShift(state, edge),
    plate: edge.rest,
    borderWidth: edge.borderWidth,
  };
}

/**
 * Which rung a control is on, given what the platform can actually observe.
 *
 * A finger has no hover, so `raised` is unreachable on a touch surface and
 * asking for it would leave a control that never rests. Passing the platform in
 * rather than branching per component is what stops that being re-decided
 * fifteen times.
 */
export function edgeStateFor(
  platform: "web" | "native",
  flags: { pressed?: boolean; hovered?: boolean },
): InkState {
  if (flags.pressed) return "pressed";
  if (platform === "web" && flags.hovered) return "raised";
  return "rest";
}

/**
 * The plate's radius.
 *
 * It is not the face's radius. The plate sits `offset` behind and outside the
 * face's corner, so matching radii leaves a visible crescent of plate poking
 * past the corner on the leading side. Growing it by the offset keeps the two
 * curves concentric, which is what a printed offset actually looks like.
 *
 * `pill` is the exception and stays pill: 999 plus anything is still a pill,
 * and clamping it to a real number would flatten a chip.
 */
export function plateRadius(faceRadius: number, offset: number): number {
  if (faceRadius >= RADIUS.pill) return faceRadius;
  return faceRadius + offset;
}

/**
 * How much room the edge needs beyond the face.
 *
 * On the web a shadow costs no layout, which is why a grid of ink cards can
 * have its plates overlap the gutter without anyone noticing. On native the
 * plate is a real view, so the container reserves this on its trailing edges.
 *
 * The two behaviours are a genuine difference between the platforms rather than
 * a bug in either, and the web renderer exposes `reserve` so a layout that has
 * to match across both can opt in.
 */
export function edgeInset(edge: InkEdgeTokens = EDGE): number {
  return edge.rest;
}
