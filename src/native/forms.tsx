/**
 * The form controls, on native.
 *
 * Two of these are where the "same props on both platforms" promise costs the
 * most, and both are worth the cost:
 *
 * - **`InkSelect`** has no native equivalent. React Native ships no `<select>`,
 *   and the community pickers are each a dependency with a different API. So it
 *   is a button that opens an `InkSheet` of `InkChoice`s — which is what a
 *   picker is on a touch screen anyway, and it means one API describes both.
 * - **`InkSlider`** is a `PanResponder` over a measured track, because the ink
 *   thumb is the point and no platform slider will wear it.
 */
import { useRef, useState, type ReactNode } from "react";
import {
  PanResponder,
  Pressable,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { hitSlop } from "../core/reach.js";
import { useInkTheme } from "./InkProvider.js";
import { InkChoice } from "./controls.js";
import { InkSheet } from "./overlays.js";
import { inkText } from "./type.js";

/* ── Input ─────────────────────────────────────────────────────────────────
 *
 * `invalid` is a message, not a boolean. A field that turns red without saying
 * why has told the reader they are wrong and withheld the fix.
 */

export interface InkInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  invalid?: string;
  disabled?: boolean;
  type?: "text" | "search" | "email" | "url" | "number";
  lead?: ReactNode;
  trail?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const KEYBOARDS = {
  text: "default",
  search: "web-search",
  email: "email-address",
  url: "url",
  number: "numeric",
} as const;

export function InkInput({
  value,
  onChange,
  label,
  placeholder,
  invalid,
  disabled,
  type = "text",
  lead,
  trail,
  style,
}: InkInputProps) {
  const theme = useInkTheme();
  const [focused, setFocused] = useState(false);
  const field = inkText(theme, { size: "md" });
  const error = inkText(theme, { size: "sm", color: theme.color.dangerFg });

  return (
    <View style={[{ gap: theme.space[1] }, style]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.space[2],
          minHeight: theme.touch.tapMin,
          paddingHorizontal: theme.space[3],
          borderWidth: theme.edge.hairlineWidth,
          borderColor: invalid
            ? theme.color.dangerFg
            : focused
              ? theme.color.accentLine
              : theme.color.lineStrong,
          borderRadius: theme.radius.md,
          backgroundColor: theme.color.surface,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {lead}
        <TextInput
          value={value}
          onChangeText={onChange}
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={theme.color.textTertiary}
          keyboardType={KEYBOARDS[type]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          style={[field.style, { flex: 1, paddingVertical: theme.space[2] }]}
        />
        {trail}
      </View>
      {invalid ? (
        <Text accessibilityLiveRegion="polite" style={error.style}>
          {invalid}
        </Text>
      ) : null}
    </View>
  );
}

/* ── Text area ─────────────────────────────────────────────────────────── */

export function InkTextArea({
  value,
  onChange,
  label,
  placeholder,
  rows = 3,
  disabled,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  maxRows?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const field = inkText(theme, { size: "md" });

  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      multiline
      numberOfLines={rows}
      editable={!disabled}
      placeholder={placeholder}
      placeholderTextColor={theme.color.textTertiary}
      accessibilityLabel={label}
      style={[
        field.style,
        {
          padding: theme.space[3],
          borderWidth: theme.edge.hairlineWidth,
          borderColor: theme.color.lineStrong,
          borderRadius: theme.radius.md,
          backgroundColor: theme.color.surface,
          minHeight: rows * 24 + theme.space[4],
        },
        style as StyleProp<ViewStyle>,
      ]}
    />
  );
}

/* ── Select ────────────────────────────────────────────────────────────── */

export interface InkSelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export function InkSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  style,
}: {
  label: string;
  value: T;
  options: InkSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const text = inkText(theme, { size: "md", weight: theme.weight.semibold });

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: current?.label }}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.space[3],
            minHeight: theme.touch.tapMin,
            paddingHorizontal: theme.space[3],
            borderWidth: theme.edge.hairlineWidth,
            borderColor: theme.color.lineStrong,
            borderRadius: theme.radius.md,
            backgroundColor: theme.color.surface,
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        <Text style={text.style}>{current?.label ?? ""}</Text>
        <Text style={inkText(theme, { color: theme.color.textSecondary }).style}>&#9662;</Text>
      </Pressable>

      <InkSheet open={open} onClose={() => setOpen(false)} title={label}>
        <View style={{ gap: theme.space[2] }}>
          {options.map((option) => (
            <InkChoice
              key={option.value}
              role="radio"
              shape="tile"
              selected={option.value === value}
              disabled={option.disabled}
              onSelect={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </InkChoice>
          ))}
        </View>
      </InkSheet>
    </>
  );
}

/* ── Checkbox ──────────────────────────────────────────────────────────── */

export function InkCheckbox({
  checked,
  onChange,
  label,
  indeterminate = false,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  indeterminate?: boolean;
  disabled?: boolean;
}) {
  const theme = useInkTheme();
  const on = indeterminate || checked;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: indeterminate ? "mixed" : checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      hitSlop={hitSlop(22, theme.touch.tapMin)}
      style={{
        width: 22,
        height: 22,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: theme.edge.borderWidth,
        borderColor: theme.color.edge,
        borderRadius: theme.radius.xs,
        backgroundColor: on ? theme.color.accent : theme.color.surface,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {indeterminate ? (
        <View style={{ width: 10, height: 2, backgroundColor: theme.color.textOnAccent }} />
      ) : checked ? (
        <View
          style={{
            width: 10,
            height: 6,
            borderLeftWidth: 2,
            borderBottomWidth: 2,
            borderColor: theme.color.textOnAccent,
            transform: [{ rotate: "-45deg" }, { translateY: -1 }],
          }}
        />
      ) : null}
    </Pressable>
  );
}

/* ── Slider ────────────────────────────────────────────────────────────────
 *
 * Built rather than borrowed, because the ink thumb is the point.
 *
 * The track measures itself with `onLayout` rather than being given a width:
 * the parent's padding, the screen and the orientation all move it, and a
 * hardcoded width is a thumb that stops short of the end on one device.
 */

export function InkSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  format,
  disabled,
  style,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  format?: (value: number) => string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const [width, setWidth] = useState(0);
  const THUMB = 20;

  const latest = useRef({ value, width, min, max, step, onChange, disabled });
  latest.current = { value, width, min, max, step, onChange, disabled };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      onPanResponderGrant: (event) => commit(event.nativeEvent.locationX),
      onPanResponderMove: (event) => commit(event.nativeEvent.locationX),
    }),
  ).current;

  function commit(x: number) {
    const s = latest.current;
    const travel = Math.max(1, s.width - THUMB);
    const ratio = Math.min(1, Math.max(0, (x - THUMB / 2) / travel));
    const raw = s.min + ratio * (s.max - s.min);
    const stepped = Math.round(raw / s.step) * s.step;
    const next = Math.min(s.max, Math.max(s.min, stepped));
    if (next !== s.value) s.onChange(next);
  }

  const ratio = max === min ? 0 : (value - min) / (max - min);
  const left = ratio * Math.max(0, width - THUMB);

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: format ? format(value) : undefined }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[{ height: 26, justifyContent: "center", opacity: disabled ? 0.5 : 1 }, style]}
      {...responder.panHandlers}
    >
      <View
        style={{
          height: 6,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.line,
          borderWidth: theme.edge.hairlineWidth,
          borderColor: theme.color.edge,
        }}
      />
      <View
        style={{
          position: "absolute",
          left,
          width: THUMB,
          height: THUMB,
          borderRadius: THUMB / 2,
          backgroundColor: theme.color.surface,
          borderWidth: theme.edge.borderWidth,
          borderColor: theme.color.edge,
        }}
      />
    </View>
  );
}
