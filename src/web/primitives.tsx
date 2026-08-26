/**
 * The quiet half: type, marks and readouts. Nothing here draws the edge.
 */
import type { CSSProperties, ReactNode } from "react";
import { toneColors, type InkTone } from "../core/tone.js";
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
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function InkBadge({ tone = "neutral", icon, className, children }: InkBadgeProps) {
  const { color } = useInkTheme();
  return (
    <span className={cx("ink-badge", className)} style={toneVars(tone, color)}>
      {icon}
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
  icon?: ReactNode;
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
      {icon}
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
