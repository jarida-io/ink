/**
 * The three navigation shapes.
 *
 * `InkBottomBar`, `InkRail` and `InkSidebar` are one list of destinations at
 * three widths, and `InkNav` picks between them. Building them as three
 * unrelated components means three places to add a badge, three places to get
 * the selected state wrong, and three answers to "what happens at six items".
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BAR_MAX, badgeText, fitBar, shapeFor, type NavDestination, type NavShape } from "../headless/nav.js";
import { stageHasMaterial, type NavbarConfig, type NavbarStage } from "../headless/navbar.js";
import { useStage } from "./useStage.js";

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

export interface InkNavDestination extends NavDestination {
  icon?: ReactNode;
}

interface CommonProps {
  /** Names the navigation for a screen reader. Required. */
  label: string;
  items: InkNavDestination[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}

function Badge({ badge }: { badge: InkNavDestination["badge"] }) {
  const text = badgeText(badge);
  if (text === null) return null;
  return (
    <span className="ink-nav__badge" data-dot={text === "" || undefined}>
      {text}
    </span>
  );
}

/* ── Bottom bar ────────────────────────────────────────────────────────────
 *
 * The phone shape. Three things it does that a row of buttons does not:
 *
 * - **It reserves the safe area.** `env(safe-area-inset-bottom)` is the home
 *   indicator on a modern phone and zero everywhere else, so the padding is
 *   correct on both without a media query and without a dependency.
 * - **It caps at five and overflows the rest.** Past the cap the last slot
 *   becomes "More" rather than the items being squeezed, because squeezing is
 *   how a five-item bar becomes a seven-item bar nobody can hit.
 * - **It drops labels on label width, not target width.** A bar can be
 *   perfectly tappable and still have every label truncated to three letters.
 */

export interface InkBottomBarProps extends CommonProps {
  /** Shown when there are more destinations than fit. */
  moreLabel?: string;
  moreIcon?: ReactNode;
  onMore?: (overflow: InkNavDestination[]) => void;
  /** `floating` lifts it off the edge as a rounded pill. */
  variant?: "docked" | "floating";
  material?: "auto" | "always" | "never";
  /**
   * Contract to a single button once the reader has committed to the content,
   * exactly as the navbar does. Pressing it brings the bar back; it does not
   * fire the destination underneath.
   */
  collapse?: boolean;
  stage?: NavbarStage;
  behaviour?: Partial<NavbarConfig>;
  scrollTarget?: HTMLElement | null;
  onStageChange?: (stage: NavbarStage) => void;
}

export function InkBottomBar({
  label,
  items,
  value,
  onChange,
  moreLabel = "More",
  moreIcon,
  onMore,
  variant = "docked",
  material = "auto",
  collapse = false,
  stage: forced,
  behaviour,
  scrollTarget,
  onStageChange,
  className,
}: InkBottomBarProps) {
  const ref = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(0);
  const [pushed, setPushed] = useState<NavbarStage | undefined>(undefined);
  const stage = useStage({
    stage: forced ?? pushed,
    behaviour,
    collapse,
    scrollTarget,
    onStageChange,
  });
  const hasMaterial =
    material === "always" ? true : material === "never" ? false : stageHasMaterial(stage);
  const collapsed = stage === "collapsed";
  const current = items.find((i) => i.key === value);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const layout = fitBar(items, width);
  const inOverflow = layout.overflow.some((i) => i.key === value);

  return (
    <nav
      ref={ref}
      aria-label={label}
      className={cx("ink-glass", "ink-bottombar", `ink-bottombar--${variant}`, className)}
      data-icons-only={layout.iconsOnly || undefined}
      data-stage={stage}
      data-material={hasMaterial}
    >
      {/* Inert rather than aria-hidden: a container hidden from the
          accessibility tree with focusable children inside it is a keyboard
          trap and an ARIA violation. */}
      <div className="ink-bottombar__body" inert={collapsed || undefined}>
      {layout.shown.map((item) => (
        <button
          key={item.key}
          type="button"
          className="ink-nav__item"
          aria-current={item.key === value ? "page" : undefined}
          disabled={item.disabled}
          onClick={() => onChange(item.key)}
        >
          <span className="ink-nav__icon">{item.icon}</span>
          {layout.iconsOnly ? null : <span className="ink-nav__label">{item.label}</span>}
          <Badge badge={item.badge} />
          {/* The selected mark, so the state is not carried by colour alone. */}
          <span className="ink-nav__mark" aria-hidden="true" />
        </button>
      ))}

      {layout.overflow.length > 0 ? (
        <button
          type="button"
          className="ink-nav__item"
          // The current destination can be inside the overflow, and the bar has
          // to say so or the reader sees nothing selected anywhere.
          aria-current={inOverflow ? "page" : undefined}
          onClick={() => onMore?.(layout.overflow)}
        >
          <span className="ink-nav__icon">
            {moreIcon ?? <span className="ink-nav__more" aria-hidden="true" />}
          </span>
          {layout.iconsOnly ? null : <span className="ink-nav__label">{moreLabel}</span>}
          <span className="ink-nav__mark" aria-hidden="true" />
        </button>
      ) : null}
      </div>

      {collapse ? (
        <button
          type="button"
          className="ink-bottombar__puck"
          // Shows where you are; pressing it restores the bar rather than
          // navigating. The reader contracted it by scrolling, not by choosing.
          aria-label="Show navigation"
          aria-expanded={!collapsed}
          tabIndex={collapsed ? 0 : -1}
          onClick={() => {
            setPushed("expanded");
            onStageChange?.("expanded");
          }}
        >
          {current?.icon ?? <span className="ink-nav__more" aria-hidden="true" />}
        </button>
      ) : null}
    </nav>
  );
}

/* ── Sidebar and rail ──────────────────────────────────────────────────────
 *
 * The same component. A rail is a sidebar whose labels have been taken away,
 * and treating them as one thing is what stops the two drifting apart — a badge
 * added to one and not the other, a section header that only exists in the
 * wide version.
 *
 * `sections` rather than a flat list, because navigation that needs a scrollbar
 * needs headings, and a heading is the cheapest way to make a long list
 * scannable.
 */

export interface InkNavSection {
  /** Omit for an unlabelled group; the rule still separates it. */
  label?: string;
  items: InkNavDestination[];
}

export interface InkSidebarProps {
  label: string;
  sections: InkNavSection[];
  value: string;
  onChange: (key: string) => void;
  /** `rail` is the same list with the labels off. */
  variant?: "sidebar" | "rail";
  /** Above the list: a logo, a workspace switcher. */
  header?: ReactNode;
  /** Pinned to the bottom: an account row, a version. */
  footer?: ReactNode;
  /** Renders the toggle. Omit and the sidebar has no collapse control. */
  onToggle?: () => void;
  className?: string;
}

export function InkSidebar({
  label,
  sections,
  value,
  onChange,
  variant = "sidebar",
  header,
  footer,
  onToggle,
  className,
}: InkSidebarProps) {
  const rail = variant === "rail";

  return (
    <nav
      aria-label={label}
      className={cx("ink-glass", "ink-glass--vertical", "ink-sidebar", rail && "ink-sidebar--rail", className)}
    >
      {header ? <div className="ink-sidebar__head">{header}</div> : null}

      <div className="ink-sidebar__body">
        {sections.map((section, index) => (
          <div key={section.label ?? `section-${index}`} className="ink-sidebar__section">
            {section.label && !rail ? (
              <span className="ink-eyebrow ink-sidebar__sectionLabel">{section.label}</span>
            ) : null}
            {section.label && rail && index > 0 ? (
              <span className="ink-sidebar__rule" role="separator" />
            ) : null}
            {section.items.map((item) => (
              <button
                key={item.key}
                type="button"
                className="ink-nav__item ink-nav__item--row"
                aria-current={item.key === value ? "page" : undefined}
                // A rail has no visible label, so the accessible name has to
                // come from somewhere. This is the whole reason `label` is a
                // string on a destination rather than a node.
                aria-label={rail ? item.label : undefined}
                title={rail ? item.label : undefined}
                disabled={item.disabled}
                onClick={() => onChange(item.key)}
              >
                <span className="ink-nav__icon">{item.icon}</span>
                {rail ? null : <span className="ink-nav__label">{item.label}</span>}
                <Badge badge={item.badge} />
                <span className="ink-nav__mark" aria-hidden="true" />
              </button>
            ))}
          </div>
        ))}
      </div>

      {footer ? <div className="ink-sidebar__foot">{footer}</div> : null}

      {onToggle ? (
        <button
          type="button"
          className="ink-sidebar__toggle"
          onClick={onToggle}
          aria-label={rail ? "Expand navigation" : "Collapse navigation"}
        >
          <span className="ink-sidebar__chev" aria-hidden="true" />
        </button>
      ) : null}
    </nav>
  );
}

/* ── The chooser ───────────────────────────────────────────────────────────
 *
 * Picks a shape from the width it is given. Takes a number rather than reading
 * a media query, because a sidebar inside a split view does not care how wide
 * the phone is.
 */

export interface InkNavProps extends CommonProps {
  /** Container width. Pass your own; `shapeFor` turns it into a shape. */
  width: number;
  /** Override the automatic choice. */
  shape?: NavShape;
  sections?: InkNavSection[];
  header?: ReactNode;
  footer?: ReactNode;
}

export function InkNav({ width, shape, items, sections, ...rest }: InkNavProps) {
  const chosen = shape ?? shapeFor(width);
  const grouped = sections ?? [{ items }];

  if (chosen === "bar") return <InkBottomBar items={items} {...rest} />;
  return <InkSidebar sections={grouped} variant={chosen === "rail" ? "rail" : "sidebar"} {...rest} />;
}

export { BAR_MAX };
