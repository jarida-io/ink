/**
 * The surfaces, on native. Same names, same props, same budget.
 */
import { useState, type ReactNode } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { edgeStateFor } from "../core/edge.js";
import { DISABLED_OPACITY } from "../tokens/control.js";
import { InkEdge } from "./InkEdge.js";
import { useInkTheme } from "./InkProvider.js";
import { inkText } from "./type.js";

/* ── Card ──────────────────────────────────────────────────────────────────
 *
 * `pressable` is the whole reason the edge is built the way it is: the press
 * drives the face down onto its plate and lands it in the space the plate was
 * occupying, which reads as a key being struck rather than a rectangle getting
 * darker.
 *
 * Note what `reserve` does not do here. On the web it is an opt-in, because a
 * box-shadow costs no layout; on native the plate is a real view and always
 * takes its 4px. The prop is accepted and ignored so the same JSX compiles on
 * both platforms — silently, because a warning about a prop that is already
 * satisfied would be noise.
 */

export interface InkCardProps {
  raised?: boolean;
  pressable?: boolean;
  /** Accepted for parity with the web renderer; native always reserves. */
  reserve?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function InkCard({
  raised = true,
  pressable = false,
  onPress,
  disabled,
  style,
  contentStyle,
  children,
}: InkCardProps) {
  const theme = useInkTheme();
  const [pressed, setPressed] = useState(false);

  const padding: StyleProp<ViewStyle> = [
    { padding: theme.space[4], gap: theme.space[2] },
    contentStyle,
  ];

  if (!pressable) {
    return (
      <InkEdge raised={raised} style={style} contentStyle={padding}>
        {children}
      </InkEdge>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[style, disabled ? { opacity: DISABLED_OPACITY } : null]}
    >
      <InkEdge
        raised={raised}
        state={edgeStateFor("native", { pressed })}
        // A flat card has no plate to press onto, so it answers with a wash.
        contentStyle={[padding, !raised && pressed ? { backgroundColor: theme.color.pressed } : null]}
      >
        {children}
      </InkEdge>
    </Pressable>
  );
}

/* ── Group ─────────────────────────────────────────────────────────────────
 *
 * One card holding rows, rather than one card per row. Fourteen models drawn as
 * fourteen ink cards is fourteen hard plates used as wallpaper; the grouping is
 * the structure worth drawing.
 */

export interface InkGroupProps {
  title: string;
  meta?: ReactNode;
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function InkGroup({ title, meta, raised = true, style, children }: InkGroupProps) {
  const theme = useInkTheme();
  const heading = inkText(theme, {
    role: "display",
    size: "md",
    weight: theme.weight.bold,
    tracking: "snug",
  });

  return (
    <InkEdge raised={raised} style={style} contentStyle={{ overflow: "hidden" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.space[3],
          minHeight: theme.rowHeight.lg,
          paddingVertical: theme.space[3],
          paddingHorizontal: theme.space[4],
          borderBottomWidth: theme.edge.hairlineWidth,
          borderColor: theme.color.line,
        }}
      >
        <Text accessibilityRole="header" style={heading.style}>
          {title}
        </Text>
        {meta}
      </View>
      <View>{children}</View>
    </InkEdge>
  );
}

/* ── Row ───────────────────────────────────────────────────────────────────
 *
 * One control per row, which is what lets the whole row clear the touch floor
 * without anything needing to grow.
 */

export interface InkRowProps {
  label: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Rows after the first draw a hairline above. */
  divided?: boolean;
}

export function InkRow({ label, description, children, divided = true }: InkRowProps) {
  const theme = useInkTheme();
  const labelStyle = inkText(theme, {
    size: "md",
    weight: theme.weight.semibold,
    leading: "snug",
  });
  const descStyle = inkText(theme, { size: "sm", color: theme.color.textSecondary });

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.space[4],
        minHeight: theme.touch.tapMin,
        paddingVertical: theme.space[3],
        paddingHorizontal: theme.space[4],
        borderTopWidth: divided ? theme.edge.hairlineWidth : 0,
        borderColor: theme.color.line,
      }}
    >
      <View style={{ flexShrink: 1, gap: 2 }}>
        {typeof label === "string" ? <Text style={labelStyle.style}>{label}</Text> : label}
        {typeof description === "string" ? (
          <Text style={descStyle.style}>{description}</Text>
        ) : (
          description
        )}
      </View>
      {children ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space[2] }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

/* ── Field ─────────────────────────────────────────────────────────────────
 *
 * The mono eyebrow, the current value beside it, the control beneath. The
 * reading is sentence case against the label's caps, so it reads as a value
 * rather than a second heading.
 */

export interface InkFieldProps {
  label: string;
  reading?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}

export function InkField({ label, reading, hint, children }: InkFieldProps) {
  const theme = useInkTheme();
  const eyebrow = inkText(theme, {
    role: "mono",
    size: "xs",
    weight: theme.weight.bold,
    tracking: "eyebrow",
    uppercase: true,
    color: theme.color.textTertiary,
  });
  const readingStyle = inkText(theme, {
    size: "sm",
    weight: theme.weight.semibold,
    color: theme.color.textSecondary,
  });
  const hintStyle = inkText(theme, { size: "sm", color: theme.color.textSecondary });

  return (
    <View style={{ gap: theme.space[2] }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.space[3],
        }}
      >
        <Text style={eyebrow.style}>{label}</Text>
        {typeof reading === "string" ? <Text style={readingStyle.style}>{reading}</Text> : reading}
      </View>
      {children}
      {typeof hint === "string" ? (
        <Text style={[hintStyle.style, { maxWidth: theme.measure.prose }]}>{hint}</Text>
      ) : (
        hint
      )}
    </View>
  );
}
