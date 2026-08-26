/**
 * The surfaces that carry the edge — and the budget that keeps them rare.
 */
import type { ReactNode } from "react";
import { useEdgeBudget } from "../core/budget.js";

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ── Card ──────────────────────────────────────────────────────────────────
 *
 * The 2px edge and the hard plate. Reach for it when the thing inside is what
 * the screen is *for* — never for a toolbar, a filter bar or a navigation
 * strip. Once the chrome starts shouting, nothing on the page is loud any more.
 *
 * `pressable` builds the interaction out of the edge rather than adding one on
 * top: at rest the face floats 4px above its plate, hover lifts it to 7, and
 * pressing drives it to 0 and moves the face by exactly the offset it lost, so
 * it lands in the space its own plate occupied. It reads as a key being struck.
 */

export interface InkCardProps {
  /** Draws the edge. False leaves a hairline — the unchosen state of a wall. */
  raised?: boolean;
  /** Adds the lift ladder and renders a real button. */
  pressable?: boolean;
  /**
   * Reserve the plate's 4px in layout, the way the native renderer always
   * does. Off by default, matching a box-shadow's zero layout cost — turn it
   * on where a grid has to line up across both platforms.
   */
  reserve?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function InkCard({
  raised = true,
  pressable = false,
  reserve = false,
  onPress,
  disabled,
  className,
  children,
}: InkCardProps) {
  useEdgeBudget(raised);

  const classes = cx(
    "ink-edge",
    "ink-card",
    !raised && "ink-edge--flat",
    reserve && "ink-edge--reserve",
    pressable && "ink-pressable",
    className,
  );

  if (pressable) {
    return (
      <button type="button" className={classes} onClick={onPress} disabled={disabled}>
        {children}
      </button>
    );
  }
  return <div className={classes}>{children}</div>;
}

/* ── Group ─────────────────────────────────────────────────────────────────
 *
 * One card holding rows, instead of one card per row.
 *
 * The rule this encodes was learned the hard way: fourteen models rendered as
 * fourteen ink cards is fourteen hard plates in a grid — the loudest treatment
 * in the system, used as wallpaper. When the grouping is the structure worth
 * drawing, the card is the group and the members are rows in it. That is one
 * edge instead of fourteen, and it is also the correct reading of the data.
 */

export interface InkGroupProps {
  title: string;
  /** A count, a size, a state. Set beside the title, never under it. */
  meta?: ReactNode;
  raised?: boolean;
  className?: string;
  children: ReactNode;
}

export function InkGroup({ title, meta, raised = true, className, children }: InkGroupProps) {
  useEdgeBudget(raised);
  return (
    <section
      className={cx("ink-edge", "ink-group", !raised && "ink-edge--flat", className)}
    >
      <header className="ink-group__head">
        <h2 className="ink-group__title">{title}</h2>
        {meta}
      </header>
      <div className="ink-group__body">{children}</div>
    </section>
  );
}

/* ── Row ───────────────────────────────────────────────────────────────────
 *
 * Label, description, control. The description is not optional in spirit: a
 * setting whose name is the only explanation is a setting named after how the
 * system is built.
 */

export interface InkRowProps {
  label: ReactNode;
  description?: ReactNode;
  /** The control. One per row — that is what lets the whole row clear 44px. */
  children?: ReactNode;
  className?: string;
}

export function InkRow({ label, description, children, className }: InkRowProps) {
  return (
    <div className={cx("ink-row", className)}>
      <div className="ink-row__text">
        <span className="ink-row__label">{label}</span>
        {description ? <span className="ink-row__desc">{description}</span> : null}
      </div>
      {children ? <div className="ink-row__control">{children}</div> : null}
    </div>
  );
}

/* ── Field ─────────────────────────────────────────────────────────────────
 *
 * An eyebrow, an optional reading of the current value beside it, and the
 * control beneath. The reading is set in sentence case against the label's
 * caps so it reads as a value and not a second heading.
 */

export interface InkFieldProps {
  label: string;
  /** What is currently chosen, shown beside the label. */
  reading?: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function InkField({ label, reading, hint, className, children }: InkFieldProps) {
  return (
    <div className={cx("ink-field", className)}>
      <div className="ink-field__head">
        <span className="ink-eyebrow">{label}</span>
        {reading ? <span className="ink-field__reading">{reading}</span> : null}
      </div>
      {children}
      {hint ? <p className="ink-prose">{hint}</p> : null}
    </div>
  );
}
