/**
 * The controls, on native.
 *
 * Two things differ from the web and both are the platform, not the design:
 *
 * - There is no `raised` rung. A finger has no hover, so `edgeStateFor` gives
 *   back rest or pressed and never the lift toward the light.
 * - Reach is `hitSlop` rather than a pseudo-element. Same rule, same numbers,
 *   vertical only — see `core/reach.ts`, where the sentence that describes the
 *   web behaviour turned out to describe this one exactly.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { edgeStateFor } from "../core/edge.js";
import { hitSlop } from "../core/reach.js";
import { useEdgeBudget } from "../shared/budget.js";
import {
  DISABLED_OPACITY,
  controlIconSize,
  controlMetrics,
  controlPadX,
  type ControlSize,
} from "../tokens/control.js";
import { SPRING } from "../tokens/motion.js";
import { InkSpinner } from "./feedback.js";
import { IconPaintProvider, renderIconSlot, type InkIconSlot } from "./icon.js";
import { InkEdge } from "./InkEdge.js";
import { useInkTheme } from "./InkProvider.js";
import { springTo } from "./motion.js";
import { inkText } from "./type.js";

/* ── Button ────────────────────────────────────────────────────────────────
 *
 * `primary` is the control that is actually asking a question, and a screen
 * gets about one. `danger` is a primary that happens to be destructive, not a
 * third emphasis level.
 *
 * Every variant's face is the control height, so a quiet Cancel beside a
 * primary Save lines up edge for edge; the plate is the only difference.
 */

export type InkButtonVariant = "primary" | "quiet" | "danger";

export interface InkButtonProps {
  variant?: InkButtonVariant;
  /** `md` is the touch floor. `sm` keeps the floor through invisible reach. */
  size?: ControlSize;
  onPress?: () => void;
  disabled?: boolean;
  /**
   * The press has been answered and the work is under way. The label stays —
   * a button that swaps its words for a spinner has stopped saying what it is
   * doing — and further presses are refused.
   */
  loading?: boolean;
  block?: boolean;
  icon?: InkIconSlot;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function InkButton({
  variant = "quiet",
  size = "md",
  onPress,
  disabled,
  loading = false,
  block,
  icon,
  style,
  children,
}: InkButtonProps) {
  const theme = useInkTheme();
  const [pressed, setPressed] = useState(false);
  const raised = variant !== "quiet";
  const metrics = controlMetrics(size);
  const inert = Boolean(disabled || loading);
  const down = pressed && !inert;

  const fill =
    variant === "primary"
      ? down
        ? theme.color.accentPressed
        : theme.color.accent
      : variant === "danger"
        ? theme.color.dangerFill
        : theme.color.surface;
  const ink =
    variant === "primary"
      ? theme.color.textOnAccent
      : variant === "danger"
        ? theme.color.textOnDanger
        : theme.color.text;
  const border = raised ? theme.edge.borderWidth : theme.edge.hairlineWidth;
  const label = inkText(theme, {
    size: size === "sm" ? "base" : size === "lg" ? "lg" : "md",
    weight: theme.weight.bold,
    tracking: "snug",
    leading: "snug",
    color: ink,
  });
  const iconSize = controlIconSize(size);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={hitSlop(metrics.height + theme.edge.rest, theme.touch.tapMin)}
      style={[
        block ? { alignSelf: "stretch" } : { alignSelf: "flex-start" },
        style,
        disabled ? { opacity: DISABLED_OPACITY } : null,
      ]}
    >
      <InkEdge
        raised={raised}
        budgeted={raised}
        radius={metrics.radius}
        edge={theme.edgeCompact}
        state={edgeStateFor("native", { pressed: down })}
        contentStyle={{
          overflow: "hidden",
          backgroundColor: fill,
          borderColor: raised ? theme.color.edge : theme.color.lineStrong,
        }}
      >
        <IconPaintProvider value={ink}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: metrics.gap,
              // Border-box: the face, borders included, is the control height.
              minHeight: metrics.height - border * 2,
              paddingHorizontal: metrics.padX - border,
              paddingVertical: theme.space[1],
              backgroundColor: !raised && down ? theme.color.pressed : undefined,
            }}
          >
            {loading ? <InkSpinner label="" size={iconSize - 2} /> : renderIconSlot(icon, iconSize)}
            <Text style={[label.style, { flexShrink: 1, textAlign: "center" }]}>{children}</Text>
          </View>
        </IconPaintProvider>
      </InkEdge>
    </Pressable>
  );
}

/* ── Choice ────────────────────────────────────────────────────────────────
 *
 * State is elevation, not hue. A chosen thing rises on its offset; everything
 * unchosen lies flat with a hairline. No tint, no check mark doing the edge's
 * job, and no `color` prop to spend on decoration.
 *
 * The budget only counts this while it is selected, which is the point: a row
 * of twelve voices spends one edge, not twelve.
 *
 * Choosing one must not move its neighbours. The border thickens from one
 * pixel to two, so the padding gives the pixel back and the box holds still.
 */

export interface InkChoiceProps {
  selected: boolean;
  onSelect?: () => void;
  shape?: "pill" | "tile";
  meta?: ReactNode;
  disabled?: boolean;
  /** `radio` inside a group; `button` when it stands alone as a toggle. */
  role?: "button" | "radio";
  children: ReactNode;
}

export function InkChoice({
  selected,
  onSelect,
  shape = "tile",
  meta,
  disabled,
  role = "button",
  children,
}: InkChoiceProps) {
  const theme = useInkTheme();
  const [pressed, setPressed] = useState(false);
  useEdgeBudget(selected);

  const pill = shape === "pill";
  const border = selected ? theme.edge.borderWidth : theme.edge.hairlineWidth;
  const padX = (pill ? controlPadX("sm", "pill") : controlPadX("md")) - border;
  const padY = pill ? 0 : theme.space[3] - border;
  const visualHeight = pill ? theme.touch.tapDense : theme.touch.tapMin;

  const name = inkText(theme, {
    size: "base",
    weight: theme.weight.bold,
    tracking: "snug",
    color: selected ? theme.color.text : theme.color.textSecondary,
  });
  const metaStyle = inkText(theme, {
    role: "mono",
    size: "sm",
    weight: theme.weight.bold,
    tracking: "wide",
    color: selected ? theme.color.ink : theme.color.textTertiary,
  });

  return (
    <Pressable
      accessibilityRole={role === "radio" ? "radio" : "button"}
      accessibilityState={role === "radio" ? { checked: selected, disabled } : { selected, disabled }}
      disabled={disabled}
      onPress={onSelect}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      // Vertical only. Sideways growth makes adjacent pills steal each other's
      // taps, which is worse than a small target because it is wrong.
      hitSlop={hitSlop(visualHeight, theme.touch.tapMin)}
      style={disabled ? { opacity: DISABLED_OPACITY } : undefined}
    >
      <InkEdge
        raised={selected}
        budgeted={false}
        radius={pill ? theme.radius.pill : theme.radius.md}
        edge={theme.edgeCompact}
        state={edgeStateFor("native", { pressed: pressed && selected })}
        contentStyle={{
          flexDirection: pill ? "row" : "column",
          alignItems: pill ? "center" : "flex-start",
          justifyContent: "center",
          gap: pill ? theme.space[2] : 2,
          minHeight: visualHeight,
          paddingVertical: padY,
          paddingHorizontal: padX,
          minWidth: pill ? 0 : 84,
          borderColor: selected ? theme.color.edge : theme.color.lineStrong,
          // Unchosen things answer the press too; they just answer it flat.
          backgroundColor: pressed && !selected ? theme.color.pressed : theme.color.surface,
        }}
      >
        <Text style={name.style}>{children}</Text>
        {typeof meta === "string" ? <Text style={metaStyle.style}>{meta}</Text> : meta}
      </InkEdge>
    </Pressable>
  );
}

/* ── Segmented ─────────────────────────────────────────────────────────────
 *
 * Enumerated settings use this. They do not use a text input: a field that
 * accepts anything when the system accepts six things exists to be typed into
 * wrongly.
 */

export interface InkSegmentedOption<T extends string> {
  value: T;
  label: string;
  meta?: ReactNode;
  disabled?: boolean;
}

export interface InkSegmentedProps<T extends string> {
  label: string;
  value: T;
  options: InkSegmentedOption<T>[];
  onChange: (value: T) => void;
  shape?: "pill" | "tile";
  style?: StyleProp<ViewStyle>;
}

export function InkSegmented<T extends string>({
  label,
  value,
  options,
  onChange,
  shape = "pill",
  style,
}: InkSegmentedProps<T>) {
  const theme = useInkTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[{ flexDirection: "row", flexWrap: "wrap", gap: theme.space[2] }, style]}
    >
      {options.map((option) => (
        <InkChoice
          key={option.value}
          role="radio"
          shape={shape}
          selected={option.value === value}
          disabled={option.disabled}
          meta={option.meta}
          onSelect={() => onChange(option.value)}
        >
          {option.label}
        </InkChoice>
      ))}
    </View>
  );
}

/* ── Switch ────────────────────────────────────────────────────────────────
 *
 * Built rather than borrowed. The platform switch is the right call in most
 * apps and the wrong one here: it arrives with its own border, its own
 * elevation and its own idea of an accent, and a screen that is otherwise all
 * ink edge with one Material pill in it looks like a screen with a bug.
 *
 * `label` is the name a screen reader hears. `children`, when given, is shown
 * beside the switch and is part of what can be pressed — a switch whose words
 * do nothing when tapped is a switch people tap twice.
 */

export interface InkSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const SWITCH = { width: 46, height: 28, knob: 20 } as const;

export function InkSwitch({ checked, onChange, label, disabled, children, style }: InkSwitchProps) {
  const theme = useInkTheme();
  const [pressed, setPressed] = useState(false);
  const inset = theme.edge.borderWidth + 2;
  const travel = SWITCH.width - SWITCH.knob - inset * 2;
  const position = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    if (!theme.animate) {
      position.setValue(checked ? 1 : 0);
      return;
    }
    const animation = springTo(position, checked ? 1 : 0, { spring: SPRING.snappy, rest: 0.001 });
    animation.start();
    return () => animation.stop();
  }, [checked, theme.animate, position]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label ?? (typeof children === "string" ? children : undefined)}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={hitSlop(SWITCH.height, theme.touch.tapMin)}
      style={[
        { flexDirection: "row", alignItems: "center", gap: theme.space[3], alignSelf: "flex-start" },
        style,
        disabled ? { opacity: DISABLED_OPACITY } : null,
      ]}
    >
      <View
        style={{
          width: SWITCH.width,
          height: SWITCH.height,
          justifyContent: "center",
          borderWidth: theme.edge.borderWidth,
          borderColor: theme.color.edge,
          borderRadius: theme.radius.pill,
          backgroundColor: checked ? theme.color.accent : theme.color.lineStrong,
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            left: 2,
            width: SWITCH.knob,
            height: SWITCH.knob,
            borderRadius: SWITCH.knob / 2,
            backgroundColor: theme.color.surface,
            borderWidth: theme.edge.borderWidth,
            borderColor: theme.color.edge,
            transform: [
              { translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) },
              // The knob gives under the thumb, so the press is felt before the flip.
              { scale: pressed ? 0.88 : 1 },
            ],
          }}
        />
      </View>
      {typeof children === "string" ? (
        <Text style={[inkText(theme, { size: "md" }).style, { flexShrink: 1 }]}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
