/**
 * The bar.
 *
 * Behaviour is in `@jarida/ink/headless` — `nextStage` decides expanded /
 * condensed / collapsed from a scroll reading, with hysteresis so a reader
 * resting on a threshold does not make it strobe. This file is only the
 * rendering, which is what lets a Vue or Svelte binding be this file again and
 * nothing else.
 *
 * ## Three stages
 *
 *     expanded    the whole bar, no material; a large title sits below it
 *     condensed   the material arrives, the title moves in, extras go
 *     collapsed   one button
 *
 * ## Why the collapsed button expands rather than acting
 *
 * Pressing the puck returns the bar. It does **not** fire the action underneath
 * it: the reader collapsed the bar by scrolling, not by choosing to, so the
 * first press is them asking to see their options again. An action that fires
 * from a control whose label has been animated away is an action nobody agreed
 * to.
 *
 * ## Two ways to give it actions
 *
 * `trail` takes arbitrary content and is never touched. `actions` takes a list
 * and lets the bar decide what survives each stage — which it has to be able to
 * do, because "drop the secondary controls" is not something it can work out
 * about an opaque node. Collapse needs `actions`.
 */
import { useState, type ReactNode } from "react";
import {
  stageHasMaterial,
  titlePlacement,
  type NavbarConfig,
  type NavbarStage,
} from "../headless/navbar.js";
import { useStage } from "./useStage.js";

export type InkNavbarVariant = "sticky" | "floating" | "static";

/**
 * `auto` follows the stage. The other two exist for bars that are not over
 * scrolling content — a modal header, a page that fits — where "no material
 * until something passes underneath" would mean no material, ever.
 */
export type InkNavbarMaterial = "auto" | "always" | "never";

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
  /**
   * Start the title large and below the bar, and move it in on scroll.
   *
   * Requires the bar to be `sticky` or `floating` and to sit at the top of the
   * scrolling content, because the large title renders directly beneath it.
   */
  largeTitle?: boolean;
  lead?: ReactNode;
  /** Arbitrary trailing content. Never condensed — the bar cannot reason about it. */
  trail?: ReactNode;
  /** Structured actions the bar may drop as it condenses. Required for collapse. */
  actions?: InkNavbarAction[];
  variant?: InkNavbarVariant;
  material?: InkNavbarMaterial;
  /** Shrink to a single button once the reader has committed to the content. */
  collapse?: boolean;
  /** A count on the collapsed puck, so a hidden action can still say it needs you. */
  collapsedBadge?: ReactNode;
  /** Thresholds, hysteresis and the reveal distance. */
  behaviour?: Partial<NavbarConfig>;
  /**
   * Drive the stage yourself.
   *
   * The one prop whose derivation differs by platform: the web can watch a
   * scroller, React Native cannot, so there it comes from the list's `onScroll`.
   */
  stage?: NavbarStage;
  onStageChange?: (stage: NavbarStage) => void;
  /** The element that scrolls. Defaults to the window. */
  scrollTarget?: HTMLElement | null;
  children?: ReactNode;
  className?: string;
}

export function InkNavbar({
  title,
  largeTitle = false,
  lead,
  trail,
  actions,
  variant = "floating",
  material = "auto",
  collapse = false,
  collapsedBadge,
  behaviour,
  stage: forced,
  onStageChange,
  scrollTarget,
  children,
  className,
}: InkNavbarProps) {
  const [pushed, setPushed] = useState<NavbarStage | undefined>(undefined);
  const derived = useStage({ stage: forced ?? pushed, behaviour, collapse, scrollTarget, onStageChange });
  const stage = derived;

  const hasMaterial =
    material === "always" ? true : material === "never" ? false : stageHasMaterial(stage);
  const titleInBar = !largeTitle || titlePlacement(stage) === "in-bar";
  const collapsed = stage === "collapsed";

  const primary = actions?.find((a) => a.primary) ?? actions?.[0];
  const shown = collapsed ? [] : stage === "condensed" ? (primary ? [primary] : []) : actions;

  const classes = [
    "ink-glass",
    variant === "floating" && "ink-glass--raised",
    "ink-navbar",
    `ink-navbar--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className="ink-navbar__slot" data-stage={stage} data-variant={variant}>
        <header className={classes} data-stage={stage} data-material={hasMaterial}>
          {/*
            `inert` rather than `aria-hidden`. A container that is aria-hidden
            with focusable children inside it is an ARIA violation and a real
            keyboard trap: the reader tabs into a control a screen reader has
            been told does not exist. `inert` removes it from both trees at once.
          */}
          <div className="ink-navbar__body" inert={collapsed || undefined}>
            {children ?? (
              <>
                {lead ? <div className="ink-navbar__lead">{lead}</div> : null}
                {title && titleInBar ? <h1 className="ink-navbar__title">{title}</h1> : null}
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
              // Shows the primary action's glyph; does not perform it.
              aria-label="Show navigation"
              aria-expanded={!collapsed}
              tabIndex={collapsed ? 0 : -1}
              onClick={() => {
                // Pushing the stage rather than setting local state: the hook
                // owns it, and the next scroll reading takes over from here.
                setPushed("expanded");
                onStageChange?.("expanded");
              }}
            >
              {primary?.icon ?? <span className="ink-navbar__puckMark" aria-hidden="true" />}
              {collapsedBadge ? (
                <span className="ink-navbar__puckBadge">{collapsedBadge}</span>
              ) : null}
            </button>
          ) : null}
        </header>
      </div>

      {largeTitle && title ? (
        <div className="ink-navbar__large" data-shown={!titleInBar} aria-hidden={titleInBar}>
          <h1 className="ink-navbar__largeTitle">{title}</h1>
        </div>
      ) : null}
    </>
  );
}
