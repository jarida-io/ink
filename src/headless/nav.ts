/**
 * Navigation shape — deciding what a set of destinations should look like,
 * independent of which one you are rendering.
 *
 * A bottom bar, a rail and a sidebar are the same list of destinations at three
 * widths. Treating them as three components means three places to add a badge,
 * three places to get the selected state wrong, and three answers to "what
 * happens at six items". Treating them as one list plus a shape means one.
 */

export type NavShape = "bar" | "rail" | "sidebar";

export interface NavDestination {
  key: string;
  label: string;
  /**
   * Whatever the renderer draws — a React node, a React Native element, an SVG
   * string. `unknown` here rather than a framework type, and the functions
   * below are generic so a caller's own shape survives the round trip instead
   * of being widened to this one.
   */
  icon?: unknown;
  /** A count, or `true` for a plain dot. Zero renders nothing. */
  badge?: number | boolean;
  disabled?: boolean;
}

/**
 * How many destinations a bottom bar can hold before it stops being usable.
 *
 * Five is the number every platform independently arrived at. On the narrowest
 * phone in common use (320pt) five slots is 64pt each, which still clears the
 * 44pt target floor with room either side; six does not.
 */
export const BAR_MAX = 5;

/**
 * Slot width below which the labels come off.
 *
 * A separate constraint from the target floor, and the two get confused
 * constantly. **Targets** stop being reliable below 44pt. **Labels** stop
 * fitting well before that — a two-word destination at 11pt needs roughly 72pt
 * of slot, so a bar can be perfectly tappable and still have every label
 * truncated to three characters.
 *
 * This is an approximation, because measuring text is the renderer's job and
 * not something a pure function can do. A renderer that measures should decide
 * for itself and ignore this.
 */
export const LABEL_MIN_SLOT = 72;

export interface BarLayout<T extends NavDestination = NavDestination> {
  /** The destinations that fit. */
  shown: T[];
  /** Everything after the cut, for a "More" destination. */
  overflow: T[];
  /** True when the slots are too narrow to hold a label. */
  iconsOnly: boolean;
}

/**
 * Fit a list into a bottom bar.
 *
 * Past `BAR_MAX` the last visible slot becomes "More" rather than the items
 * being squeezed — squeezing is how a five-item bar becomes a seven-item bar
 * nobody can hit. Labels are dropped first if the width is genuinely tight,
 * because an icon with no label is worse than a small label but much better
 * than a target you miss.
 */
export function fitBar<T extends NavDestination>(items: T[], width: number): BarLayout<T> {
  // A disabled destination still occupies a slot: removing it would make the
  // bar's layout change as things become available, which is worse than a
  // control that is visibly unavailable.
  const slots = Math.min(items.length, BAR_MAX);
  // Width of 0 means "not measured yet" rather than "no room", and guessing
  // icons-only on the first paint produces a visible flicker to labels.
  const iconsOnly = width > 0 && width / slots < LABEL_MIN_SLOT;

  if (items.length <= BAR_MAX) {
    return { shown: items, overflow: [], iconsOnly };
  }
  return {
    shown: items.slice(0, BAR_MAX - 1),
    overflow: items.slice(BAR_MAX - 1),
    iconsOnly,
  };
}

/**
 * The shape a given width wants.
 *
 * Breakpoints rather than a media query so the same answer is available on
 * native, in a test, and to a layout that is narrower than the window it sits
 * in. A sidebar in a split view does not care how wide the phone is.
 */
export function shapeFor(width: number): NavShape {
  if (width < 640) return "bar";
  if (width < 1024) return "rail";
  return "sidebar";
}

/** A badge that is zero, false or undefined is not a badge. */
export function badgeText(badge: NavDestination["badge"]): string | null {
  if (badge === undefined || badge === false || badge === 0) return null;
  if (badge === true) return "";
  return badge > 99 ? "99+" : String(badge);
}

/* ── The sidebar ladder ────────────────────────────────────────────────────
 *
 * Four rungs rather than an open/closed boolean, because a sidebar has more
 * than two useful states and products keep rebuilding the middle two by hand:
 *
 *     full     labels, section headings, the lot
 *     rail     icons only — still navigation, just quiet
 *     button   one control; the navigation is available but not present
 *     hidden   gone, for content that wants the whole screen
 *
 * `rail` and `button` are different answers to the same pressure and are often
 * confused. A rail keeps every destination one press away and costs 68px; a
 * button costs nothing and makes every destination two presses. Which is right
 * depends on how often the reader switches, not on how narrow the window is.
 */

export type SidebarSize = "full" | "rail" | "button" | "hidden";

const LADDER: SidebarSize[] = ["full", "rail", "button", "hidden"];

/** One rung narrower, or wider. Stops at the ends rather than wrapping. */
export function stepSidebar(current: SidebarSize, direction: "narrower" | "wider"): SidebarSize {
  const at = LADDER.indexOf(current);
  const next = direction === "narrower" ? at + 1 : at - 1;
  return LADDER[Math.min(LADDER.length - 1, Math.max(0, next))] ?? current;
}

/**
 * What a toggle should do next, and what to call it.
 *
 * A single control that cycles through four states is a control nobody can
 * predict, so the toggle only ever moves between the two rungs a product has
 * chosen — `collapsed` and its expanded partner.
 */
export function sidebarToggle(current: SidebarSize, collapsed: SidebarSize = "rail") {
  const expanded: SidebarSize = "full";
  const next = current === expanded ? collapsed : expanded;
  return { next, label: next === expanded ? "Expand navigation" : "Collapse navigation" };
}

/** How wide a rung is, in px. `button` and `hidden` take no layout width. */
export function sidebarWidth(size: SidebarSize): number {
  if (size === "full") return NAV_WIDTH_FULL;
  if (size === "rail") return NAV_WIDTH_RAIL;
  return 0;
}

export const NAV_WIDTH_FULL = 248;
export const NAV_WIDTH_RAIL = 68;

/**
 * The size a container width suggests.
 *
 * Below the bar breakpoint a sidebar should not be inline at all — it becomes
 * an overlay, which is a *presentation* rather than a size, so this returns
 * `hidden` and leaves the drawer to the caller.
 */
export function sidebarSizeFor(width: number): SidebarSize {
  if (width < 640) return "hidden";
  if (width < 1024) return "rail";
  return "full";
}
