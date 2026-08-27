import { renderIconSlot, type InkIconSlot } from "./icon.js";
/**
 * The three navigation shapes.
 *
 * `InkBottomBar`, `InkRail` and `InkSidebar` are one list of destinations at
 * three widths, and `InkNav` picks between them. Building them as three
 * unrelated components means three places to add a badge, three places to get
 * the selected state wrong, and three answers to "what happens at six items".
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { pageSlots } from "../headless/pagination.js";
import {
  BAR_MAX,
  badgeText,
  fitBar,
  shapeFor,
  sidebarToggle,
  type NavDestination,
  type NavShape,
  type SidebarSize,
} from "../headless/nav.js";
import { stageHasMaterial, type NavbarConfig, type NavbarStage } from "../headless/navbar.js";
import { useStage } from "./useStage.js";

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

export interface InkNavDestination extends NavDestination {
  icon?: InkIconSlot;
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
  moreIcon?: InkIconSlot;
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
  variant = "floating",
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
      className={cx(
        "ink-glass",
        variant === "floating" && "ink-glass--raised",
        "ink-bottombar",
        `ink-bottombar--${variant}`,
        className,
      )}
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
          <span className="ink-nav__icon">{renderIconSlot(item.icon, 24)}</span>
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
          {renderIconSlot(current?.icon, 24) ?? <span className="ink-nav__more" aria-hidden="true" />}
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
  /**
   * Which rung of the ladder. Four, not a boolean, because a sidebar has more
   * than two useful states and `rail` and `button` are different answers:
   * a rail keeps every destination one press away and costs 68px, a button
   * costs nothing and makes every destination two presses.
   */
  size?: SidebarSize;
  onSizeChange?: (size: SidebarSize) => void;
  /** Which rung the toggle collapses to. */
  collapseTo?: SidebarSize;
  /**
   * `overlay` floats it above the content with a scrim — the phone answer, and
   * the fullscreen one. `inline` keeps it in the layout.
   */
  presentation?: "inline" | "overlay";
  /** Only meaningful for `overlay`. */
  open?: boolean;
  onClose?: () => void;
  /** `floating` insets it and rounds its corners; `flush` runs to the edges. */
  variant?: "flush" | "floating";
  header?: ReactNode;
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
  size = "full",
  onSizeChange,
  collapseTo = "rail",
  presentation = "inline",
  open = true,
  onClose,
  variant = "floating",
  header,
  footer,
  onToggle,
  className,
}: InkSidebarProps) {
  const rail = size === "rail";
  const overlay = presentation === "overlay";
  const toggle = sidebarToggle(size, collapseTo);

  // `button` and `hidden` take no layout width. The puck is rendered for
  // `button` so the navigation is still reachable; `hidden` means gone, and a
  // caller that hides it owns getting the reader back.
  if (size === "hidden" && !overlay) return null;

  if (size === "button" && !overlay) {
    return (
      <button
        type="button"
        className={cx("ink-glass", "ink-glass--raised", "ink-sidebar__puck", className)}
        aria-label="Show navigation"
        aria-expanded={false}
        onClick={() => onSizeChange?.("full")}
      >
        <span className="ink-navbar__puckMark" aria-hidden="true" />
      </button>
    );
  }

  const nav = (
    <nav
      aria-label={label}
      className={cx(
        "ink-glass",
        "ink-glass--vertical",
        variant === "floating" && "ink-glass--raised",
        "ink-sidebar",
        rail && "ink-sidebar--rail",
        variant === "floating" && "ink-sidebar--floating",
        overlay && "ink-sidebar--overlay",
        className,
      )}
      data-size={size}
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
                // come from the destination. This is the whole reason `label`
                // is a string rather than a node.
                aria-label={rail ? item.label : undefined}
                title={rail ? item.label : undefined}
                disabled={item.disabled}
                onClick={() => onChange(item.key)}
              >
                <span className="ink-nav__icon">{renderIconSlot(item.icon)}</span>
                {rail ? null : <span className="ink-nav__label">{item.label}</span>}
                <Badge badge={item.badge} />
                <span className="ink-nav__mark" aria-hidden="true" />
              </button>
            ))}
          </div>
        ))}
      </div>

      {footer ? <div className="ink-sidebar__foot">{footer}</div> : null}

      {onToggle || onSizeChange ? (
        <button
          type="button"
          className="ink-sidebar__toggle"
          onClick={() => {
            onToggle?.();
            onSizeChange?.(toggle.next);
          }}
          aria-label={toggle.label}
        >
          <span className="ink-sidebar__chev" aria-hidden="true" />
        </button>
      ) : null}
    </nav>
  );

  if (!overlay) return nav;

  return (
    <div className="ink-sidebar__overlay" data-open={open || undefined} aria-hidden={!open}>
      {/* The scrim closes it. A drawer with no way out but the toggle is a
          drawer people get stuck in on a phone. */}
      <button
        type="button"
        className="ink-sidebar__scrim"
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      {nav}
    </div>
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
  return <InkSidebar sections={grouped} size={chosen === "rail" ? "rail" : "full"} {...rest} />;
}

export { BAR_MAX };

/* ── Pagination ────────────────────────────────────────────────────────────
 *
 * The page numbers come from `pageSlots`, which keeps the control a **constant
 * width** wherever the page is. Naively clamping the window collapses it at the
 * ends, so the "next" button moves between clicks and the reader chases it.
 */

export function InkPagination({
  label = "Pagination",
  page,
  count,
  onChange,
  max = 7,
  className,
}: {
  label?: string;
  page: number;
  count: number;
  onChange: (page: number) => void;
  max?: number;
  className?: string;
}) {
  const slots = pageSlots(page, count, { max });
  return (
    <nav aria-label={label} className={cx("ink-pagination", className)}>
      <button
        type="button"
        className="ink-pagination__step"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <span className="ink-calendar__chev" data-dir="prev" aria-hidden="true" />
      </button>

      {slots.map((slot, i) =>
        slot === "gap" ? (
          <span key={`gap-${i}`} className="ink-pagination__gap" aria-hidden="true">
            &hellip;
          </span>
        ) : (
          <button
            key={slot}
            type="button"
            className="ink-pagination__page"
            aria-label={`Page ${slot}`}
            aria-current={slot === page ? "page" : undefined}
            onClick={() => onChange(slot)}
          >
            {slot}
          </button>
        ),
      )}

      <button
        type="button"
        className="ink-pagination__step"
        aria-label="Next page"
        disabled={page >= count}
        onClick={() => onChange(page + 1)}
      >
        <span className="ink-calendar__chev" data-dir="next" aria-hidden="true" />
      </button>
    </nav>
  );
}

/* ── Stepper ───────────────────────────────────────────────────────────────
 *
 * Progress through a sequence. An `<ol>`, because that is what it is, and the
 * current step carries `aria-current` so a screen reader can find it without
 * counting.
 *
 * A completed step is pressable and a future one is not — going back is always
 * allowed, skipping ahead is the product's decision and it has to say so.
 */

export interface InkStep {
  key: string;
  label: string;
  description?: ReactNode;
}

export function InkStepper({
  label,
  steps,
  current,
  onChange,
  orientation = "horizontal",
  className,
}: {
  label: string;
  steps: InkStep[];
  /** Index of the step in progress. Everything before it is complete. */
  current: number;
  /** Omit to make the stepper a read-out rather than a control. */
  onChange?: (index: number) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  return (
    <ol
      aria-label={label}
      className={cx("ink-stepper", `ink-stepper--${orientation}`, className)}
    >
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        const reachable = onChange && i < current;
        const Tag = reachable ? "button" : "div";
        return (
          <li key={step.key} className="ink-stepper__step" data-state={state}>
            <Tag
              {...(reachable ? { type: "button" as const, onClick: () => onChange(i) } : {})}
              className="ink-stepper__body"
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="ink-stepper__marker" aria-hidden="true">
                {state === "done" ? <span className="ink-stepper__tick" /> : i + 1}
              </span>
              <span className="ink-stepper__text">
                <span className="ink-stepper__label">{step.label}</span>
                {step.description ? (
                  <span className="ink-stepper__desc">{step.description}</span>
                ) : null}
              </span>
            </Tag>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Floating action button ────────────────────────────────────────────────
 *
 * The one action a screen exists for, parked where a thumb reaches. It wears
 * the ink edge because it is content rather than chrome — it is the thing the
 * screen is for, not a way of getting somewhere else.
 */

export function InkFab({
  label,
  icon,
  onPress,
  extended,
  position = "bottom-end",
  disabled,
  className,
}: {
  /** Always required: an icon-only control with no name is unusable. */
  label: string;
  icon?: InkIconSlot;
  onPress?: () => void;
  /** Shows the label beside the icon. */
  extended?: boolean;
  position?: "bottom-end" | "bottom-start" | "static";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cx("ink-fab", extended && "ink-fab--extended", className)}
      data-position={position}
      aria-label={extended ? undefined : label}
      disabled={disabled}
      onClick={onPress}
    >
      {renderIconSlot(icon, 24) ?? <span className="ink-fab__plus" aria-hidden="true" />}
      {extended ? <span className="ink-fab__label">{label}</span> : null}
    </button>
  );
}

/* ── Speed dial ────────────────────────────────────────────────────────────
 *
 * A fab that opens into a short list of actions. Kept to a handful on purpose:
 * past about five it is a menu that happens to be round, and a menu is better
 * at being one.
 */

export function InkSpeedDial({
  label,
  actions,
  icon,
  position = "bottom-end",
  className,
}: {
  label: string;
  actions: { key: string; label: string; icon?: InkIconSlot; onPress?: () => void }[];
  icon?: InkIconSlot;
  position?: "bottom-end" | "bottom-start" | "static";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onAway = (e: MouseEvent) =>
      !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onAway);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onAway);
    };
  }, [open]);

  return (
    <div ref={root} className={cx("ink-speeddial", className)} data-position={position} data-open={open || undefined}>
      <div className="ink-speeddial__actions" role="menu" aria-label={label} hidden={!open}>
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            role="menuitem"
            className="ink-speeddial__action"
            onClick={() => {
              action.onPress?.();
              setOpen(false);
            }}
          >
            <span className="ink-speeddial__actionLabel">{action.label}</span>
            <span className="ink-speeddial__actionIcon">{renderIconSlot(action.icon)}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="ink-fab"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        {renderIconSlot(icon, 24) ?? <span className="ink-fab__plus" aria-hidden="true" />}
      </button>
    </div>
  );
}

/* ── Drawer ────────────────────────────────────────────────────────────────
 *
 * A panel from an edge, over the content. The difference from `InkSheet` is
 * intent rather than geometry: a sheet holds a *decision* and is dismissed by
 * answering it; a drawer holds *navigation or tools* and is dismissed by going
 * back to what you were doing. So a drawer can be resized, can be pinned open
 * on a wide screen, and does not take focus the way a modal does.
 */

export function InkDrawer({
  label,
  open,
  onClose,
  side = "start",
  size = "auto",
  children,
  className,
}: {
  label: string;
  open: boolean;
  onClose: () => void;
  side?: "start" | "end" | "bottom";
  /** `full` covers the screen — the phone answer for a navigation drawer. */
  size?: "auto" | "full";
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={cx("ink-drawer", `ink-drawer--${side}`, size === "full" && "ink-drawer--full", className)}
      data-open={open || undefined}
      aria-hidden={!open}
    >
      {/* A real button: a drawer whose only exit is its own toggle is one
          people get stuck in, and the keyboard needs somewhere to land. */}
      <button
        type="button"
        className="ink-drawer__scrim"
        aria-label={`Close ${label}`}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside className="ink-glass ink-drawer__panel" aria-label={label}>
        {children}
      </aside>
    </div>
  );
}
