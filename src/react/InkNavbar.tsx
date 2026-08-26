/**
 * The bar, and its collapse.
 *
 * All of the behaviour lives in `@jarida/ink/headless` — `nextStage` decides
 * expanded / condensed / collapsed from a scroll reading, with hysteresis so a
 * reader resting on a threshold does not make it strobe. This file is only the
 * rendering, which is the point of splitting them: a Vue or Svelte binding is
 * this file again, and nothing else.
 *
 * ## Three stages
 *
 *     expanded    the whole bar, and no material
 *     condensed   the material arrives; secondary actions go
 *     collapsed   one button
 *
 * ## Why the collapsed button expands rather than acting
 *
 * Pressing the puck returns the bar. It does **not** fire the action underneath
 * it, and that is deliberate: the reader collapsed it by scrolling, not by
 * choosing to, so the first press is them asking to see their options again. An
 * action that fires from a control whose label has been animated away is an
 * action nobody agreed to.
 *
 * ## Two ways to give it actions
 *
 * `trail` takes arbitrary content and is never touched. `actions` takes a list
 * and lets the bar decide what survives each stage — which it has to be able to
 * do, because "drop the secondary controls" is not something it can work out
 * about an opaque node. Collapse needs `actions`.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  NAVBAR_DEFAULTS,
  nextStage,
  stageHasMaterial,
  type NavbarConfig,
  type NavbarStage,
} from "../headless/navbar.js";

export type InkNavbarVariant = "sticky" | "floating" | "static";

export interface InkNavbarAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onPress?: () => void;
  /** Survives condensing, and is what the collapsed puck shows. One, at most. */
  primary?: boolean;
}

export interface InkNavbarProps {
  title?: ReactNode;
  lead?: ReactNode;
  /** Arbitrary trailing content. Never condensed — the bar cannot reason about it. */
  trail?: ReactNode;
  /** Structured actions the bar may drop as it condenses. Required for collapse. */
  actions?: InkNavbarAction[];
  variant?: InkNavbarVariant;
  /** Shrink to a single button once the reader has committed to the content. */
  collapse?: boolean;
  /** Thresholds, hysteresis and the reveal distance. */
  behaviour?: Partial<NavbarConfig>;
  /**
   * Drive the stage yourself.
   *
   * The only prop whose derivation differs by platform: the web can watch the
   * window, React Native cannot, so there it comes from the list's `onScroll`.
   */
  stage?: NavbarStage;
  /** The element that scrolls. Defaults to the window. */
  scrollTarget?: HTMLElement | null;
  children?: ReactNode;
  className?: string;
}

export function InkNavbar({
  title,
  lead,
  trail,
  actions,
  variant = "sticky",
  collapse = false,
  behaviour,
  stage: forced,
  scrollTarget,
  children,
  className,
}: InkNavbarProps) {
  const config = useMemo<NavbarConfig>(
    () => ({
      ...NAVBAR_DEFAULTS,
      ...behaviour,
      // Collapse is opt-in, and a threshold of zero is how the state machine
      // already expresses "never" — so the same code path serves both, with no
      // second flag for `nextStage` to reconcile. Applied last so it wins over
      // a `behaviour.collapseAt` passed while collapse is off.
      collapseAt: collapse ? (behaviour?.collapseAt ?? NAVBAR_DEFAULTS.collapseAt) : 0,
    }),
    [collapse, behaviour],
  );

  // Starts expanded, and the first scroll reading corrects it. The bar is at
  // its most legible expanded, so an environment where the listener never fires
  // gets the whole bar rather than a mystery button.
  const [observed, setStage] = useState<NavbarStage>("expanded");
  const stage = forced ?? observed;
  const stageRef = useRef<NavbarStage>(stage);
  stageRef.current = stage;

  useEffect(() => {
    if (forced !== undefined || typeof window === "undefined") return;
    const target: HTMLElement | Window = scrollTarget ?? window;
    let last = readOffset(target);
    let queued = false;

    const onScroll = () => {
      // Coalesced to one reading per frame. A scroll handler that runs its
      // logic on every event runs it dozens of times per frame on a trackpad.
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const y = readOffset(target);
        const next = nextStage(stageRef.current, { scrollY: y, delta: y - last }, config);
        last = y;
        if (next !== stageRef.current) setStage(next);
      });
    };

    onScroll();
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [forced, scrollTarget, config]);

  const primary = actions?.find((a) => a.primary) ?? actions?.[0];
  const shown =
    stage === "expanded" ? actions : stage === "condensed" ? (primary ? [primary] : []) : [];

  const classes = [
    "ink-glass",
    "ink-navbar",
    variant !== "static" && `ink-navbar--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="ink-navbar__slot" data-stage={stage} data-variant={variant}>
      <header
        className={classes}
        data-stage={stage}
        data-material={stageHasMaterial(stage)}
      >
        <div className="ink-navbar__body" aria-hidden={stage === "collapsed" || undefined}>
          {children ?? (
            <>
              {lead ? <div className="ink-navbar__lead">{lead}</div> : null}
              {title ? <h1 className="ink-navbar__title">{title}</h1> : null}
              <div className="ink-navbar__spacer" />
              {trail ? <div className="ink-navbar__trail">{trail}</div> : null}
              {shown && shown.length > 0 ? (
                <div className="ink-navbar__trail">
                  {shown.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      className="ink-navbar__action"
                      onClick={action.onPress}
                      aria-label={action.icon ? action.label : undefined}
                    >
                      {action.icon ?? action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        {collapse ? (
          <button
            type="button"
            className="ink-navbar__puck"
            // It shows the primary action's glyph and does not perform it.
            aria-label="Show navigation"
            aria-expanded={stage !== "collapsed"}
            tabIndex={stage === "collapsed" ? 0 : -1}
            onClick={() => setStage("expanded")}
          >
            {primary?.icon ?? <span className="ink-navbar__puckMark" aria-hidden="true" />}
          </button>
        ) : null}
      </header>
    </div>
  );
}

function readOffset(target: HTMLElement | Window): number {
  return target instanceof Window ? target.scrollY : target.scrollTop;
}
