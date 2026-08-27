/**
 * The quiet half: type, marks and readouts. Nothing here draws the edge.
 */
import type { CSSProperties, ReactNode } from "react";
import { toneColors, type InkTone } from "../core/tone.js";
import { renderIconSlot, type InkIconSlot } from "./icon.js";
import { useInkTheme } from "./InkProvider.js";

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Tone reaches the stylesheet as two variables rather than a class per tone. */
function toneVars(tone: InkTone, color: ReturnType<typeof useInkTheme>["color"]): CSSProperties {
  const t = toneColors(tone, color);
  return { "--ink-tone-fg": t.fg, "--ink-tone-soft": t.soft } as CSSProperties;
}

/* ── Title ─────────────────────────────────────────────────────────────────
 *
 * Bold italic at -0.02em. The single most recognisable thing about this
 * typography and the reason a settings page reads as something built for a
 * house rather than a server rack.
 *
 * Level 3 drops the italic on purpose: at 18px inside a card it stops reading
 * as a voice and starts reading as a slant.
 */

export interface InkTitleProps {
  level?: 1 | 2 | 3;
  /** Overrides the heading element without changing the look. */
  as?: "h1" | "h2" | "h3" | "h4" | "p";
  className?: string;
  children: ReactNode;
}

export function InkTitle({ level = 1, as, className, children }: InkTitleProps) {
  const Tag = as ?? (`h${level}` as "h1");
  return <Tag className={cx("ink-title", `ink-title--${level}`, className)}>{children}</Tag>;
}

/* ── Eyebrow ───────────────────────────────────────────────────────────────
 *
 * Mono, uppercase, 0.14em. Structural type: a group of fields separated by an
 * eyebrow needs no rule and no box.
 */

export function InkEyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cx("ink-eyebrow", className)}>{children}</span>;
}

/** Body copy that is meant to be read rather than glanced at. Capped at 62ch. */
export function InkProse({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cx("ink-prose", className)}>{children}</p>;
}

/* ── Badge ─────────────────────────────────────────────────────────────────
 *
 * A fact about a thing, set in mono because it is data — a grade, a size, a
 * count. There is no `color`; pick the tone that names what it means.
 */

export interface InkBadgeProps {
  tone?: InkTone;
  icon?: InkIconSlot;
  className?: string;
  children: ReactNode;
}

export function InkBadge({ tone = "neutral", icon, className, children }: InkBadgeProps) {
  const { color } = useInkTheme();
  return (
    <span className={cx("ink-badge", className)} style={toneVars(tone, color)}>
      {renderIconSlot(icon, 16)}
      {children}
    </span>
  );
}

/* ── Notice ────────────────────────────────────────────────────────────────
 *
 * Say what happened, not that something did. `role` follows the tone: a danger
 * notice announces itself, a neutral one waits to be read.
 */

export interface InkNoticeProps {
  tone?: InkTone;
  icon?: InkIconSlot;
  className?: string;
  children: ReactNode;
}

export function InkNotice({ tone = "neutral", icon, className, children }: InkNoticeProps) {
  const { color } = useInkTheme();
  const assertive = tone === "danger";
  return (
    <p
      className={cx("ink-notice", className)}
      style={toneVars(tone, color)}
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
    >
      {renderIconSlot(icon)}
      {children}
    </p>
  );
}

/* ── Meter ─────────────────────────────────────────────────────────────────
 *
 * A transfer, a level, a share. `value` is 0..1; omit it when the total is not
 * known yet and the bar paces instead of claiming a percentage it does not
 * have.
 */

export interface InkMeterProps {
  /** 0..1. Omit for indeterminate. */
  value?: number;
  /** Required: a bar with no name is a decoration. */
  label: string;
  className?: string;
}

export function InkMeter({ value, label, className }: InkMeterProps) {
  const indeterminate = value === undefined || Number.isNaN(value);
  const clamped = indeterminate ? 0 : Math.min(1, Math.max(0, value));
  return (
    <div
      className={cx("ink-meter", className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped * 100)}
    >
      <span
        className="ink-meter__fill"
        data-indeterminate={indeterminate || undefined}
        style={indeterminate ? undefined : { width: `${clamped * 100}%` }}
      />
    </div>
  );
}

/* ── Stage ─────────────────────────────────────────────────────────────────
 *
 * A quiet inset: border, soft fill, no plate. Deliberately not an ink card —
 * it usually sits inside one, and a raised box inside a raised box is the
 * third copy of a signal that only works when it is rare.
 */

export function InkStage({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("ink-stage", className)}>{children}</div>;
}

/* ── Chip ──────────────────────────────────────────────────────────────────
 *
 * Distinct from `InkBadge`, and the difference is interaction rather than size.
 * A badge is a *fact about something else* — a count, a grade, a size — and it
 * is never pressable. A chip is a **thing in its own right**: a filter that is
 * on, a tag on a record, a recipient in a field. It can be pressed, and it can
 * be removed.
 *
 * The remove control is a separate button rather than the chip itself being
 * pressable-to-delete, because a chip that vanishes when you meant to select it
 * is the worst outcome available.
 */

export interface InkChipProps {
  tone?: InkTone;
  icon?: InkIconSlot;
  /** Makes the chip itself pressable. */
  onPress?: () => void;
  /** Adds a remove control. Its label names what is being removed. */
  onRemove?: () => void;
  /** For a filter chip that is currently applied. */
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function InkChip({
  tone = "neutral",
  icon,
  onPress,
  onRemove,
  selected,
  disabled,
  className,
  children,
}: InkChipProps) {
  const { color } = useInkTheme();
  const label = typeof children === "string" ? children : undefined;

  const body = (
    <>
      {icon ? <span className="ink-chip__icon">{renderIconSlot(icon, 16)}</span> : null}
      <span className="ink-chip__label">{children}</span>
    </>
  );

  return (
    <span
      className={cx("ink-chip", onRemove && "ink-chip--removable", className)}
      style={toneVars(tone, color)}
      data-selected={selected || undefined}
      data-disabled={disabled || undefined}
    >
      {onPress ? (
        <button
          type="button"
          className="ink-chip__press"
          aria-pressed={selected}
          disabled={disabled}
          onClick={onPress}
        >
          {body}
        </button>
      ) : (
        <span className="ink-chip__press">{body}</span>
      )}

      {onRemove ? (
        <button
          type="button"
          className="ink-chip__remove"
          aria-label={label ? `Remove ${label}` : "Remove"}
          disabled={disabled}
          onClick={onRemove}
        >
          &times;
        </button>
      ) : null}
    </span>
  );
}

/* ── Text ──────────────────────────────────────────────────────────────────
 *
 * The type scale as a component, for the body copy that is not a title, an
 * eyebrow or prose. `as` decides the element and `size` decides the look, and
 * they are separate on purpose: a heading that needs to be small is still a
 * heading, and a `<p>` that needs to look like one is still a paragraph.
 */

export function InkText({
  as: Tag = "p",
  size = "md",
  weight,
  tone,
  mono,
  numeric,
  className,
  children,
}: {
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "strong" | "small";
  size?: "xs" | "sm" | "base" | "md" | "lg" | "xl";
  weight?: "regular" | "medium" | "semibold" | "bold";
  tone?: "default" | "secondary" | "tertiary";
  mono?: boolean;
  /** Tabular figures, for anything a reader compares down a column. */
  numeric?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={cx("ink-text", className)}
      data-size={size}
      data-weight={weight}
      data-tone={tone}
      data-mono={mono || undefined}
      data-numeric={numeric || undefined}
    >
      {children}
    </Tag>
  );
}

/* ── Link ──────────────────────────────────────────────────────────────────
 *
 * Underlined by default, and that is not a style preference. A link identified
 * only by colour is invisible to a reader who cannot distinguish it, and inside
 * a paragraph there is nothing else to mark it. `standalone` drops the underline
 * for a link that is already obviously one — a nav item, a card that is a link.
 */

export function InkLink({
  href,
  onPress,
  standalone,
  external,
  className,
  children,
}: {
  href?: string;
  onPress?: () => void;
  standalone?: boolean;
  /** Adds the mark and the `rel` that stops the new tab reaching back. */
  external?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const props = {
    className: cx("ink-link", standalone && "ink-link--standalone", className),
    ...(external ? { target: "_blank", rel: "noreferrer noopener" } : {}),
  };

  const body = (
    <>
      {children}
      {external ? <span className="ink-link__external" aria-label="(opens in a new tab)" /> : null}
    </>
  );

  if (href) return <a href={href} {...props}>{body}</a>;
  return (
    <button type="button" onClick={onPress} {...props}>
      {body}
    </button>
  );
}

/* ── Surface ───────────────────────────────────────────────────────────────
 *
 * A plain panel: the fill and the radius, with no edge and no plate. What
 * `InkCard` is when the content is not what the screen is for — a well, a
 * section background, somewhere to sit a form.
 */

export function InkSurface({
  tone = "surface",
  padded = true,
  className,
  children,
}: {
  tone?: "surface" | "content" | "chrome";
  padded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx("ink-surface", !padded && "ink-surface--flush", className)}
      data-tone={tone}
    >
      {children}
    </div>
  );
}
