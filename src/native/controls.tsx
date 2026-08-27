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
import { useState, type ReactNode } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { edgeStateFor } from "../core/edge.js";
import { renderIconSlot, type InkIconSlot } from "./icon.js";
import { useEdgeBudget } from "../shared/budget.js";
import { hitSlop } from "../core/reach.js";
import { InkEdge } from "./InkEdge.js";
import { useInkTheme } from "./InkProvider.js";
import { inkText } from "./type.js";

/* ── Button ────────────────────────────────────────────────────────────────
 *
 * `primary` is the control that is actually asking a question, and a screen
 * gets about one. `danger` is a primary that happens to be destructive, not a
 * third emphasis level.
 */

export type InkButtonVariant = "primary" | "quiet" | "danger";

export interface InkButtonProps {
  variant?: InkButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
  block?: boolean;
  icon?: InkIconSlot;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function InkButton({
  variant = "quiet",
  onPress,
  disabled,
  block,
  icon,
  style,
  children,
}: InkButtonProps) {
  const theme = useInkTheme();
  const [pressed, setPressed] = useState(false);
  const raised = variant !== "quiet";

  const fill =
    variant === "primary"
      ? theme.color.accent
      : variant === "danger"
        ? theme.color.danger
        : theme.color.surface;
  const label = inkText(theme, {
    size: "md",
    weight: theme.weight.bold,
    tracking: "snug",
    color: raised ? theme.color.textOnAccent : theme.color.text,
  });

  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.space[2],
        minHeight: theme.touch.tapMin - (raised ? theme.edge.rest : 0),
        paddingHorizontal: theme.space[5],
        backgroundColor: fill,
      }}
    >
      {renderIconSlot(icon)}
      <Text style={label.style}>{children}</Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[block ? { alignSelf: "stretch" } : { alignSelf: "flex-start" }, style,
        disabled ? { opacity: 0.5 } : null]}
    >
      <InkEdge
        raised={raised}
        budgeted={raised}
        radius={theme.radius.md}
        edge={theme.edgeCompact}
        state={edgeStateFor("native", { pressed })}
        contentStyle={{ overflow: "hidden", backgroundColor: fill }}
      >
        {body}
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

  const pill = shape === "pill";
  const visualHeight = pill ? theme.touch.tapDense : theme.touch.tapMin;

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
      style={disabled ? { opacity: 0.5 } : undefined}
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
          gap: pill ? theme.space[2] : 3,
          paddingVertical: pill ? 7 : 10,
          paddingHorizontal: pill ? 15 : 13,
          minWidth: pill ? 0 : 84,
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
 */

export interface InkSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function InkSwitch({ checked, onChange, label, disabled }: InkSwitchProps) {
  const theme = useInkTheme();
  const width = 46;
  const knob = 20;
  const travel = width - knob - theme.edge.borderWidth * 2 - 4;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      hitSlop={hitSlop(28, theme.touch.tapMin)}
      style={{
        width,
        height: 28,
        justifyContent: "center",
        paddingHorizontal: 2,
        borderWidth: theme.edge.borderWidth,
        borderColor: theme.color.edge,
        borderRadius: theme.radius.pill,
        backgroundColor: checked ? theme.color.accent : theme.color.line,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={{
          width: knob,
          height: knob,
          borderRadius: knob / 2,
          backgroundColor: theme.color.surface,
          borderWidth: theme.edge.borderWidth,
          borderColor: theme.color.edge,
          transform: [{ translateX: checked ? travel : 0 }],
        }}
      />
    </Pressable>
  );
}
