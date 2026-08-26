/**
 * The navigation bar's behaviour, as a state machine with no framework in it.
 *
 * Everything a Liquid-Glass-style bar does on scroll is decided here, in a pure
 * function, so React, Vue, Svelte, a vanilla page and React Native can all run
 * the identical logic instead of each re-implementing it slightly differently.
 *
 * ## The three stages
 *
 *     expanded    the whole bar: title, and every action
 *     condensed   the bar keeps its shape but drops to essentials
 *     collapsed   one button, and nothing else
 *
 * The collapse is the part worth being careful about. A bar that shrinks to a
 * single control frees the screen for content, which is the whole point — but
 * it also removes navigation from a page the reader is still moving through, so
 * getting it back has to be immediate and unconditional. That is what
 * `expandOnScrollUp` is for: any upward movement past `revealAfter` returns the
 * bar, without waiting to reach a threshold on the way back down.
 *
 * ## Why hysteresis
 *
 * Thresholds without it flicker. A reader resting near the boundary — a
 * trackpad's inertia, a thumb held still on a rubber-banding list — crosses it
 * repeatedly, and the bar strobes between two stages. `hysteresis` is the
 * distance the scroll must travel *back* before a stage is given up, so the
 * boundary for entering a stage and the boundary for leaving it are not the
 * same number.
 *
 * ## Why this is pure
 *
 * `nextStage` takes the current stage and a reading, and returns a stage. It
 * touches no element, holds no timer and reads no global. That makes the
 * behaviour testable without a browser, identical on a device, and — the reason
 * it matters most — auditable: every reason the bar can change shape is one of
 * the branches below.
 */

export type NavbarStage = "expanded" | "condensed" | "collapsed";

export interface NavbarConfig {
  /** Scroll distance at which the bar drops to essentials. */
  condenseAt: number;
  /** Scroll distance at which it becomes a single button. 0 disables collapse. */
  collapseAt: number;
  /** How far back the scroll must travel before a stage is given up. */
  hysteresis: number;
  /** Any upward movement past this many px returns the bar immediately. */
  revealAfter: number;
  /** False pins the bar expanded — for a page that does not scroll. */
  enabled: boolean;
}

export const NAVBAR_DEFAULTS: NavbarConfig = {
  condenseAt: 24,
  // Far enough down that a reader has committed to the content rather than
  // glancing at it. Collapsing after a flick would take the navigation away
  // from someone who had not started reading.
  collapseAt: 220,
  hysteresis: 32,
  // A deliberate upward gesture, not a wobble. Below about 8px this fires on
  // the elastic bounce at the end of a fling.
  revealAfter: 8,
  enabled: true,
};

export interface NavbarReading {
  /** Current scroll offset of the container the bar belongs to. */
  scrollY: number;
  /** Change since the last reading. Negative is upward. */
  delta: number;
}

/**
 * The whole behaviour, in one pure function.
 *
 * Order matters here and is deliberate: the reveal is checked before the
 * thresholds, so an upward gesture always wins. A reader reaching for the
 * navigation should never have to out-scroll a rule.
 */
export function nextStage(
  current: NavbarStage,
  reading: NavbarReading,
  config: NavbarConfig = NAVBAR_DEFAULTS,
): NavbarStage {
  if (!config.enabled) return "expanded";

  const { scrollY, delta } = reading;

  // At the very top the bar is always whole, whatever it was doing.
  if (scrollY <= 0) return "expanded";

  // An upward gesture returns the bar without waiting for a threshold.
  if (delta <= -config.revealAfter) {
    return scrollY > config.condenseAt ? "condensed" : "expanded";
  }

  const collapses = config.collapseAt > 0;

  // Entering a stage uses the threshold; leaving it uses the threshold minus
  // the hysteresis, so the two boundaries are different numbers and a reader
  // resting on one of them does not strobe.
  const enterCollapse = config.collapseAt;
  const leaveCollapse = config.collapseAt - config.hysteresis;
  const enterCondense = config.condenseAt;
  const leaveCondense = Math.max(0, config.condenseAt - config.hysteresis);

  if (current === "collapsed") {
    if (scrollY < leaveCollapse) return scrollY > leaveCondense ? "condensed" : "expanded";
    return "collapsed";
  }

  if (collapses && scrollY >= enterCollapse) return "collapsed";

  if (current === "condensed") {
    return scrollY < leaveCondense ? "expanded" : "condensed";
  }

  return scrollY >= enterCondense ? "condensed" : "expanded";
}

/** Whether the bar should be carrying its material at this stage. */
export function stageHasMaterial(stage: NavbarStage): boolean {
  return stage !== "expanded";
}

/**
 * Where a large title belongs at this stage.
 *
 * The pattern is a screen name that starts big, below the bar, and moves *into*
 * the bar as the reader scrolls — so the name is prominent when there is
 * nothing to compete with and out of the way once there is.
 *
 * It needs no threshold of its own. "The bar has taken its material" and "the
 * title has moved in" are the same moment, and giving them separate numbers is
 * how they end up a frame apart.
 */
export function titlePlacement(stage: NavbarStage): "below" | "in-bar" {
  return stage === "expanded" ? "below" : "in-bar";
}

/**
 * A tiny stateful wrapper, for hosts that would rather not track the previous
 * offset themselves. Still no framework and no DOM.
 */
export class NavbarBehaviour {
  private stage: NavbarStage = "expanded";
  private lastY = 0;
  private listeners = new Set<(stage: NavbarStage) => void>();

  constructor(private config: NavbarConfig = NAVBAR_DEFAULTS) {}

  /** Feed it a scroll offset; it returns the stage and notifies on change. */
  public scrolled(scrollY: number): NavbarStage {
    const delta = scrollY - this.lastY;
    this.lastY = scrollY;
    const next = nextStage(this.stage, { scrollY, delta }, this.config);
    if (next !== this.stage) {
      this.stage = next;
      for (const listener of this.listeners) listener(next);
    }
    return next;
  }

  public current(): NavbarStage {
    return this.stage;
  }

  /** Force a stage — a menu opening should not leave the bar collapsed. */
  public set(stage: NavbarStage): void {
    if (stage === this.stage) return;
    this.stage = stage;
    for (const listener of this.listeners) listener(stage);
  }

  public subscribe(listener: (stage: NavbarStage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public configure(config: Partial<NavbarConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
