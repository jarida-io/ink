/**
 * The quiet half, on native. Same names and same props as the web renderer.
 */
import type { ReactNode } from "react";
import { Text, View, type StyleProp, type TextStyle } from "react-native";
import { toneColors, type InkTone } from "../core/tone.js";
import { useInkTheme } from "./InkProvider.js";
import { inkText, slantTransform } from "./type.js";

/* ── Title ─────────────────────────────────────────────────────────────────
 *
 * The bold italic screen title. On the web the browser synthesises an oblique
 * out of Quicksand; here there is no italic face to synthesise from, so an
 * honest `fontStyle: "italic"` renders upright on Android and the signature
 * vanishes without a warning.
 *
 * So unless the app has registered a real italic (`hasTrueItalic` on the
 * provider), the slant is applied as a transform. It is a fake, it is stated as
 * one, and it is much better than the alternative of quietly not being there.
 */

export interface InkTitleProps {
  level?: 1 | 2 | 3;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
}

export function InkTitle({ level = 1, style: override, children }: InkTitleProps) {
  const theme = useInkTheme();
  const { style, slant } = inkText(theme, {
    role: "display",
    size: level === 1 ? "2xl" : level === 2 ? "xl" : "lg",
    weight: theme.weight.bold,
    // Level 3 sits inside a card at 18px, where the slant stops reading as a
    // voice and starts reading as a slant.
    italic: level !== 3,
    tracking: level === 3 ? "tight" : "title",
    leading: "tight",
  });

  return (
    <Text
      accessibilityRole="header"
      style={[style, slant ? { transform: slantTransform(slant) } : null, override]}
    >
      {children}
    </Text>
  );
}

/* ── Eyebrow ─────────────────────────────────────────────────────────────── */

export function InkEyebrow({ children }: { children: ReactNode }) {
  const theme = useInkTheme();
  const { style } = inkText(theme, {
    role: "mono",
    size: "xs",
    weight: theme.weight.bold,
    tracking: "eyebrow",
    uppercase: true,
    color: theme.color.textTertiary,
  });
  return <Text style={style}>{children}</Text>;
}

/* ── Prose ─────────────────────────────────────────────────────────────────
 *
 * Capped at a measure rather than a character count: `62ch` has no meaning
 * here, so `theme.measure.prose` carries the same idea in points.
 */

export function InkProse({ children }: { children: ReactNode }) {
  const theme = useInkTheme();
  const { style } = inkText(theme, { size: "sm", color: theme.color.textSecondary });
  return <Text style={[style, { maxWidth: theme.measure.prose }]}>{children}</Text>;
}

/* ── Badge ─────────────────────────────────────────────────────────────────
 *
 * There is no `color` prop here either. Name the meaning or do without.
 */

export interface InkBadgeProps {
  tone?: InkTone;
  children: ReactNode;
}

export function InkBadge({ tone = "neutral", children }: InkBadgeProps) {
  const theme = useInkTheme();
  const colors = toneColors(tone, theme.color);
  const { style } = inkText(theme, {
    role: "mono",
    size: "xs",
    weight: theme.weight.bold,
    tracking: "wide",
    uppercase: true,
    color: colors.fg,
  });

  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingVertical: 2,
        paddingHorizontal: theme.space[2],
        borderRadius: theme.radius.pill,
        backgroundColor: colors.soft,
      }}
    >
      <Text style={style}>{children}</Text>
    </View>
  );
}

/* ── Notice ────────────────────────────────────────────────────────────────
 *
 * Say what happened, not that something did. A danger notice announces itself;
 * everything else waits to be read.
 */

export interface InkNoticeProps {
  tone?: InkTone;
  children: ReactNode;
}

export function InkNotice({ tone = "neutral", children }: InkNoticeProps) {
  const theme = useInkTheme();
  const colors = toneColors(tone, theme.color);
  const { style } = inkText(theme, { size: "sm", color: colors.fg });
  const assertive = tone === "danger";

  return (
    <View
      accessibilityRole={assertive ? "alert" : undefined}
      accessibilityLiveRegion={assertive ? "assertive" : "polite"}
      style={{
        paddingVertical: theme.space[2],
        paddingHorizontal: theme.space[3],
        borderWidth: theme.edge.hairlineWidth,
        borderColor: colors.fg,
        borderRadius: theme.radius.sm,
        backgroundColor: colors.soft,
      }}
    >
      <Text style={style}>{children}</Text>
    </View>
  );
}

/* ── Meter ─────────────────────────────────────────────────────────────────
 *
 * Omit `value` when the total is not known yet. The bar then reports itself as
 * busy rather than claiming a percentage it does not have — the same honesty
 * the web version gets from an indeterminate `progressbar`, and here it also
 * means a screen reader says "loading" instead of "0 percent".
 */

export interface InkMeterProps {
  value?: number;
  label: string;
}

export function InkMeter({ value, label }: InkMeterProps) {
  const theme = useInkTheme();
  const indeterminate = value === undefined || Number.isNaN(value);
  const clamped = indeterminate ? 0 : Math.min(1, Math.max(0, value));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={indeterminate ? { busy: true } : undefined}
      accessibilityValue={
        indeterminate ? undefined : { min: 0, max: 100, now: Math.round(clamped * 100) }
      }
      style={{
        height: 6,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.color.line,
        borderWidth: theme.edge.hairlineWidth,
        borderColor: theme.color.edge,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: "100%",
          width: indeterminate ? "35%" : `${clamped * 100}%`,
          backgroundColor: theme.color.accent,
        }}
      />
    </View>
  );
}

/* ── Stage ─────────────────────────────────────────────────────────────────
 *
 * Border, soft fill, and deliberately no plate. It usually sits inside a card
 * that already carries the edge, and a raised box inside a raised box is the
 * third copy of a signal that only works while it is rare.
 */

export function InkStage({ children }: { children: ReactNode }) {
  const theme = useInkTheme();
  return (
    <View
      style={{
        alignItems: "center",
        gap: theme.space[3],
        paddingTop: theme.space[6],
        paddingHorizontal: theme.space[4],
        paddingBottom: theme.space[5],
        backgroundColor: theme.color.brandSoft,
        borderWidth: theme.edge.borderWidth,
        borderColor: theme.color.edge,
        borderRadius: theme.radius.lg,
      }}
    >
      {children}
    </View>
  );
}
