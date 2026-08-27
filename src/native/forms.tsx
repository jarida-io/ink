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
import { renderIconSlot, type InkIconSlot } from "./icon.js";
import { valueAt } from "../headless/slider.js";
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

/* ── Radio group ───────────────────────────────────────────────────────────
 *
 * Distinct from `InkSegmented` by the question, not the look: a segment is for
 * values that fit on a line, a radio is for choices that need explaining.
 */

export interface InkRadioOption<T extends string> {
  value: T;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}

export function InkRadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  style,
}: {
  label: string;
  value: T;
  options: InkRadioOption<T>[];
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[{ gap: theme.space[1] }, style]}>
      {options.map((option) => {
        const on = option.value === value;
        const title = inkText(theme, { size: "md", weight: theme.weight.semibold });
        const desc = inkText(theme, { size: "sm", color: theme.color.textSecondary });
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled: option.disabled }}
            disabled={option.disabled}
            onPress={() => onChange(option.value)}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: theme.space[3],
              minHeight: theme.touch.tapMin,
              paddingVertical: theme.space[3],
              paddingHorizontal: theme.space[3],
              borderRadius: theme.radius.md,
              opacity: option.disabled ? 0.5 : 1,
            }}
          >
            <View
              style={{
                width: theme.space[5],
                height: theme.space[5],
                marginTop: 1,
                borderWidth: theme.edge.borderWidth,
                borderColor: theme.color.edge,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.color.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {on ? (
                <View
                  style={{
                    width: theme.space[2],
                    height: theme.space[2],
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.color.accent,
                  }}
                />
              ) : null}
            </View>
            <View style={{ flexShrink: 1, gap: 2 }}>
              <Text style={title.style}>{option.label}</Text>
              {typeof option.description === "string" ? (
                <Text style={desc.style}>{option.description}</Text>
              ) : (
                option.description
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Menu ──────────────────────────────────────────────────────────────────
 *
 * A sheet, not an anchored popover. Anchoring is a pointer idiom: on a touch
 * screen a menu attached to a button ends up under the thumb that opened it.
 * The API matches the web binding so the same JSX compiles.
 */

export interface InkMenuItem {
  key: string;
  label: string;
  icon?: InkIconSlot;
  onPress?: () => void;
  disabled?: boolean;
  separated?: boolean;
  tone?: "neutral" | "danger";
}

export function InkMenu({
  label,
  trigger,
  items,
  style,
}: {
  label: string;
  trigger: (props: { onPress: () => void; expanded: boolean }) => ReactNode;
  items: InkMenuItem[];
  align?: "start" | "end";
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={style}>
      {trigger({ onPress: () => setOpen(true), expanded: open })}
      <InkSheet open={open} onClose={() => setOpen(false)} title={label}>
        <View style={{ gap: 2 }}>
          {items.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ disabled: item.disabled }}
              disabled={item.disabled}
              onPress={() => {
                item.onPress?.();
                setOpen(false);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.space[2],
                minHeight: theme.touch.tapMin,
                paddingHorizontal: theme.space[3],
                borderRadius: theme.radius.sm,
                borderTopWidth: item.separated ? theme.edge.hairlineWidth : 0,
                borderColor: theme.color.line,
                marginTop: item.separated ? theme.space[1] : 0,
                opacity: item.disabled ? 0.45 : 1,
              }}
            >
              {renderIconSlot(item.icon)}
              <Text
                style={
                  inkText(theme, {
                    size: "base",
                    weight: theme.weight.medium,
                    color: item.tone === "danger" ? theme.color.dangerFg : theme.color.text,
                  }).style
                }
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </InkSheet>
    </View>
  );
}

/* ── Range slider ──────────────────────────────────────────────────────────
 *
 * Two thumbs on one track. The gesture claims whichever thumb is nearest where
 * it started and keeps it for the whole drag — reassigning mid-drag is how a
 * handle becomes the other handle and the value you were watching jumps.
 *
 * The ends clamp against each other rather than swapping, for the same reason.
 */

export function InkRangeSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  format,
  disabled,
  style,
}: {
  label: string;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const [width, setWidth] = useState(0);
  const THUMB = 20;

  const latest = useRef({ value, width, min, max, step, onChange, disabled });
  latest.current = { value, width, min, max, step, onChange, disabled };
  const holding = useRef<0 | 1>(0);

  const scale = () => ({
    min: latest.current.min,
    max: latest.current.max,
    step: latest.current.step,
    length: latest.current.width,
    thumb: THUMB,
  });

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      onPanResponderGrant: (event) => {
        const at = valueAt(event.nativeEvent.locationX, scale());
        const [low, high] = latest.current.value;
        // Claimed once, at the start, and held for the whole gesture.
        holding.current = Math.abs(at - low) <= Math.abs(at - high) ? 0 : 1;
        commit(event.nativeEvent.locationX);
      },
      onPanResponderMove: (event) => commit(event.nativeEvent.locationX),
    }),
  ).current;

  function commit(x: number) {
    const s = latest.current;
    const next = valueAt(x, scale());
    const [low, high] = s.value;
    if (holding.current === 0) {
      const clamped = Math.min(next, high);
      if (clamped !== low) s.onChange([clamped, high]);
    } else {
      const clamped = Math.max(next, low);
      if (clamped !== high) s.onChange([low, clamped]);
    }
  }

  const travel = Math.max(0, width - THUMB);
  const span = max - min || 1;
  const left = ((value[0] - min) / span) * travel;
  const right = ((value[1] - min) / span) * travel;

  return (
    <View
      accessibilityLabel={label}
      accessibilityValue={{
        min,
        max,
        text: format ? `${format(value[0])} to ${format(value[1])}` : `${value[0]} to ${value[1]}`,
      }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[{ height: 26, justifyContent: "center", opacity: disabled ? 0.5 : 1 }, style]}
      {...responder.panHandlers}
    >
      <View
        style={{
          height: 6,
          marginHorizontal: THUMB / 2,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.line,
          borderWidth: theme.edge.hairlineWidth,
          borderColor: theme.color.edge,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: left + THUMB / 2,
          width: Math.max(0, right - left),
          height: 6,
          backgroundColor: theme.color.accent,
        }}
      />
      {[left, right].map((offset, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: offset,
            width: THUMB,
            height: THUMB,
            borderRadius: THUMB / 2,
            backgroundColor: theme.color.surface,
            borderWidth: theme.edge.borderWidth,
            borderColor: theme.color.edge,
          }}
        />
      ))}
    </View>
  );
}

/* ── Form ──────────────────────────────────────────────────────────────────
 *
 * A layout and an error summary, not a validation library. The summary is the
 * part worth having: a form that fails silently, or scatters errors beside
 * fields that are off-screen, is a form people abandon.
 */

export interface InkFormError {
  field: string;
  message: string;
}

export function InkForm({
  label,
  errors = [],
  actions,
  children,
  style,
}: {
  label: string;
  errors?: InkFormError[];
  onSubmit?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  return (
    <View accessibilityLabel={label} style={[{ gap: theme.space[6] }, style]}>
      {errors.length > 0 ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={{
            gap: theme.space[2],
            padding: theme.space[4],
            borderWidth: theme.edge.borderWidth,
            borderColor: theme.color.dangerFg,
            borderRadius: theme.radius.md,
            backgroundColor: theme.color.dangerSoft,
          }}
        >
          <Text
            style={
              inkText(theme, { size: "md", weight: theme.weight.bold, color: theme.color.dangerFg }).style
            }
          >
            {errors.length === 1 ? "One thing needs fixing" : `${errors.length} things need fixing`}
          </Text>
          {errors.map((error) => (
            <Text
              key={error.field}
              style={inkText(theme, { size: "sm", color: theme.color.dangerFg }).style}
            >
              {error.message}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={{ gap: theme.space[5] }}>{children}</View>
      {actions ? (
        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: theme.space[3] }}>
          {actions}
        </View>
      ) : null}
    </View>
  );
}

export function InkFormField({
  label,
  hint,
  error,
  required,
  children,
  style,
}: {
  id?: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  return (
    <View style={[{ gap: theme.space[2] }, style]}>
      <Text style={inkText(theme, { size: "md", weight: theme.weight.semibold }).style}>
        {label}
        {required ? (
          // Spelled out. An asterisk is a convention nobody has been taught.
          <Text style={inkText(theme, { size: "md", color: theme.color.textSecondary }).style}>
            {" (required)"}
          </Text>
        ) : null}
      </Text>
      {typeof hint === "string" ? (
        <Text style={inkText(theme, { size: "sm", color: theme.color.textSecondary }).style}>{hint}</Text>
      ) : (
        hint
      )}
      {children}
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={
            inkText(theme, { size: "sm", weight: theme.weight.semibold, color: theme.color.dangerFg }).style
          }
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
