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
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { hitSlop } from "../core/reach.js";
import { valueAt } from "../headless/slider.js";
import { DISABLED_OPACITY } from "../tokens/control.js";
import { InkChoice } from "./controls.js";
import { fieldFrame, singleLine } from "./field.js";
import { Glyph } from "./glyph.js";
import { IconPaintProvider, renderIconSlot, type InkIconSlot } from "./icon.js";
import { useInkTheme } from "./InkProvider.js";
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
  type?: "text" | "search" | "email" | "url" | "number" | "password";
  /** A string is an icon name; anything else is drawn as given. */
  lead?: InkIconSlot;
  trail?: InkIconSlot;
  /** The return key. Pairs with `inputProps.returnKeyType`. */
  onSubmit?: () => void;
  /**
   * Everything else `TextInput` takes — `autoCapitalize`, `autoComplete`,
   * `textContentType`, a ref. The field owns its value, look and state.
   */
  inputProps?: Omit<TextInputProps, "value" | "onChangeText" | "editable" | "placeholder" | "style">;
  style?: StyleProp<ViewStyle>;
}

const KEYBOARDS = {
  text: "default",
  search: "web-search",
  email: "email-address",
  url: "url",
  number: "numeric",
  password: "default",
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
  onSubmit,
  inputProps,
  style,
}: InkInputProps) {
  const theme = useInkTheme();
  const [focused, setFocused] = useState(false);
  const field = inkText(theme, { size: "md" });
  const error = inkText(theme, { size: "sm", weight: theme.weight.semibold, color: theme.color.dangerFg });

  return (
    <View style={[{ gap: theme.space[1] + 2 }, style]}>
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.space[2],
            minHeight: theme.touch.tapMin,
            opacity: disabled ? DISABLED_OPACITY : 1,
          },
          fieldFrame(theme, { focused, invalid: Boolean(invalid) }),
        ]}
      >
        <IconPaintProvider value={theme.color.textSecondary}>
          {renderIconSlot(lead, 20)}
          <TextInput
            autoCapitalize={type === "text" ? "sentences" : "none"}
            autoCorrect={type === "text"}
            {...inputProps}
            value={value}
            onChangeText={onChange}
            editable={!disabled}
            placeholder={placeholder}
            placeholderTextColor={theme.color.textTertiary}
            keyboardType={KEYBOARDS[type]}
            secureTextEntry={type === "password" || inputProps?.secureTextEntry}
            selectionColor={theme.color.accentLine}
            cursorColor={theme.color.accentLine}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={onSubmit}
            accessibilityLabel={label}
            accessibilityHint={invalid}
            accessibilityState={{ disabled }}
            style={[singleLine(field.style), { flex: 1, alignSelf: "stretch" }]}
          />
          {renderIconSlot(trail, 20)}
        </IconPaintProvider>
      </View>
      {invalid ? (
        <Text accessibilityLiveRegion="polite" style={error.style}>
          {invalid}
        </Text>
      ) : null}
    </View>
  );
}

/* ── Text area ─────────────────────────────────────────────────────────────
 *
 * Grows with its content up to `maxRows`, then scrolls. A fixed three-line box
 * that someone is writing a paragraph into is a box that hides most of what
 * they wrote.
 */

export function InkTextArea({
  value,
  onChange,
  label,
  placeholder,
  rows = 3,
  maxRows = 12,
  invalid,
  disabled,
  inputProps,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  maxRows?: number;
  invalid?: string;
  disabled?: boolean;
  inputProps?: Omit<TextInputProps, "value" | "onChangeText" | "editable" | "placeholder" | "style" | "multiline">;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const [focused, setFocused] = useState(false);
  const field = inkText(theme, { size: "md" });
  const line = field.style.lineHeight ?? 22;
  const pad = theme.space[3];
  const error = inkText(theme, { size: "sm", weight: theme.weight.semibold, color: theme.color.dangerFg });

  return (
    <View style={[{ gap: theme.space[1] + 2 }, style]}>
      <TextInput
        {...inputProps}
        value={value}
        onChangeText={onChange}
        multiline
        // Android centres multiline text vertically unless told otherwise.
        textAlignVertical="top"
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor={theme.color.textTertiary}
        selectionColor={theme.color.accentLine}
        cursorColor={theme.color.accentLine}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        accessibilityHint={invalid}
        style={[
          field.style,
          fieldFrame(theme, { focused, invalid: Boolean(invalid) }, pad),
          {
            // A multiline input grows with its text by itself; these are the
            // floor and the cap, and past the cap it scrolls.
            minHeight: line * rows + pad * 2,
            maxHeight: line * maxRows + pad * 2,
            paddingTop: pad - (focused ? theme.edge.borderWidth : theme.edge.hairlineWidth),
            paddingBottom: pad,
            opacity: disabled ? DISABLED_OPACITY : 1,
          },
        ]}
      />
      {invalid ? (
        <Text accessibilityLiveRegion="polite" style={error.style}>
          {invalid}
        </Text>
      ) : null}
    </View>
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
  placeholder,
  disabled,
  style,
}: {
  label: string;
  value: T | undefined;
  options: InkSelectOption<T>[];
  onChange: (value: T) => void;
  /** Shown while nothing is chosen. */
  placeholder?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const [open, setOpen] = useState(false);
  const [pressed, setPressed] = useState(false);
  const current = options.find((o) => o.value === value);
  const text = inkText(theme, {
    size: "md",
    weight: current ? theme.weight.semibold : theme.weight.regular,
    color: current ? theme.color.text : theme.color.textTertiary,
  });

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: current?.label ?? placeholder }}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.space[3],
            minHeight: theme.touch.tapMin,
            opacity: disabled ? DISABLED_OPACITY : 1,
          },
          fieldFrame(theme, { focused: open }),
          pressed ? { backgroundColor: theme.color.pressed } : null,
          style,
        ]}
      >
        <Text numberOfLines={1} style={[text.style, { flexShrink: 1 }]}>
          {current?.label ?? placeholder ?? ""}
        </Text>
        <Glyph name="chevron-down" size={18} paint={theme.color.textSecondary} />
      </Pressable>

      <InkSheet open={open} onClose={() => setOpen(false)} title={label}>
        <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: theme.space[2] }}>
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

/* ── Checkbox ──────────────────────────────────────────────────────────────
 *
 * `label` is what a screen reader hears. `children`, when given, is shown
 * beside the box and is part of the target: a box whose words do nothing when
 * tapped is a box people aim at twice.
 */

const BOX = 22;

export function InkCheckbox({
  checked,
  onChange,
  label,
  indeterminate = false,
  disabled,
  children,
  style,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  indeterminate?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const [pressed, setPressed] = useState(false);
  const on = indeterminate || checked;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label ?? (typeof children === "string" ? children : undefined)}
      accessibilityState={{ checked: indeterminate ? "mixed" : checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={hitSlop(BOX, theme.touch.tapMin)}
      style={[
        { flexDirection: "row", alignItems: "center", gap: theme.space[3], alignSelf: "flex-start" },
        style,
        disabled ? { opacity: DISABLED_OPACITY } : null,
      ]}
    >
      <View
        style={{
          width: BOX,
          height: BOX,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: theme.edge.borderWidth,
          borderColor: theme.color.edge,
          borderRadius: theme.radius.xs,
          backgroundColor: on
            ? pressed
              ? theme.color.accentPressed
              : theme.color.accent
            : pressed
              ? theme.color.pressed
              : theme.color.surface,
        }}
      >
        {on ? (
          <Glyph
            name={indeterminate ? "minus" : "check"}
            size={BOX - theme.edge.borderWidth * 2}
            paint={theme.color.textOnAccent}
          />
        ) : null}
      </View>
      {typeof children === "string" ? (
        <Text style={[inkText(theme, { size: "md" }).style, { flexShrink: 1 }]}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

/* ── Slider ────────────────────────────────────────────────────────────────
 *
 * Built rather than borrowed, because the ink thumb is the point.
 *
 * The track measures itself with `onLayout` rather than being given a width:
 * the parent's padding, the screen and the orientation all move it. The
 * position is read from where the drag began plus how far it has gone, never
 * from `locationX` mid-drag — that is relative to whichever child is under the
 * finger, so touching the thumb used to read as touching the start of the track.
 *
 * Held, the thumb rises onto its plate: the one moment it is chosen.
 */

const THUMB = 22;
const THUMB_BOX = THUMB + 4;
const TRACK = 6;

/** One step from `value`, at the step's own precision so 0.1 never reads 0.30000000000000004. */
function stepFrom(value: number, step: number, direction: 1 | -1): number {
  const places = (String(step).split(".")[1] ?? "").length;
  return Number((value + direction * step).toFixed(places));
}

function useTrack(onPosition: (x: number, phase: "start" | "move") => void, disabled?: boolean) {
  const [held, setHeld] = useState(false);
  const live = useRef({ onPosition, disabled });
  live.current = { onPosition, disabled };
  const start = useRef(0);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !live.current.disabled,
      onMoveShouldSetPanResponder: () => !live.current.disabled,
      // A list scrolling underneath must not take the thumb away mid-drag.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        start.current = event.nativeEvent.locationX;
        setHeld(true);
        live.current.onPosition(start.current, "start");
      },
      onPanResponderMove: (_event, gesture) => live.current.onPosition(start.current + gesture.dx, "move"),
      onPanResponderRelease: () => setHeld(false),
      onPanResponderTerminate: () => setHeld(false),
    }),
  ).current;

  return { held, handlers: responder.panHandlers };
}

function Thumb({ left, held, label, value, onStep }: {
  left: number;
  held: boolean;
  label?: string;
  value?: { min: number; max: number; now: number; text?: string };
  onStep?: (direction: 1 | -1) => void;
}) {
  const theme = useInkTheme();
  const plate = 3;
  return (
    <View
      {...(onStep
        ? {
            accessible: true,
            accessibilityRole: "adjustable" as const,
            accessibilityLabel: label,
            accessibilityValue: value,
            accessibilityActions: [{ name: "increment" }, { name: "decrement" }],
            onAccessibilityAction: (e: { nativeEvent: { actionName: string } }) =>
              onStep(e.nativeEvent.actionName === "increment" ? 1 : -1),
          }
        : {})}
      pointerEvents="none"
      style={{ position: "absolute", left, top: (THUMB_BOX - THUMB) / 2, width: THUMB + plate, height: THUMB + plate }}
    >
      {held ? (
        <View
          style={{
            position: "absolute",
            left: plate,
            top: plate,
            width: THUMB,
            height: THUMB,
            borderRadius: THUMB / 2,
            backgroundColor: theme.color.ink,
          }}
        />
      ) : null}
      <View
        style={{
          width: THUMB,
          height: THUMB,
          borderRadius: THUMB / 2,
          backgroundColor: theme.color.surface,
          borderWidth: theme.edge.borderWidth,
          borderColor: theme.color.edge,
          transform: held ? [{ translateX: -1 }, { translateY: -1 }] : [],
        }}
      />
    </View>
  );
}

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
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const { held, handlers } = useTrack((x) => {
    const next = valueAt(x, { min, max, step, length: width, thumb: THUMB });
    if (next !== value) onChange(next);
  }, disabled);

  const ratio = max === min ? 0 : (clamp(value) - min) / (max - min);
  const travel = Math.max(0, width - THUMB);
  const left = ratio * travel;

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      hitSlop={hitSlop(THUMB, theme.touch.tapMin)}
      style={[{ height: THUMB_BOX, justifyContent: "center", opacity: disabled ? DISABLED_OPACITY : 1 }, style]}
      {...handlers}
    >
      <View
        pointerEvents="none"
        style={{
          height: TRACK,
          marginHorizontal: THUMB / 2,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.line,
          borderWidth: theme.edge.hairlineWidth,
          borderColor: theme.color.lineStrong,
          overflow: "hidden",
        }}
      >
        <View style={{ width: left, height: "100%", backgroundColor: theme.color.accent }} />
      </View>
      <Thumb
        left={left}
        held={held}
        label={label}
        value={{ min, max, now: value, text: format ? format(value) : undefined }}
        onStep={(direction) => {
          const next = clamp(stepFrom(value, step, direction));
          if (next !== value) onChange(next);
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
  const title = inkText(theme, { size: "md", weight: theme.weight.semibold, leading: "snug" });
  const desc = inkText(theme, { size: "sm", color: theme.color.textSecondary });
  const dot = theme.space[5];

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[{ gap: theme.space[1] }, style]}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled: option.disabled }}
            disabled={option.disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "flex-start",
              gap: theme.space[3],
              minHeight: theme.touch.tapMin,
              paddingVertical: theme.space[3],
              paddingHorizontal: theme.space[3],
              borderRadius: theme.radius.md,
              backgroundColor: pressed ? theme.color.pressed : undefined,
              opacity: option.disabled ? DISABLED_OPACITY : 1,
            })}
          >
            <View
              style={{
                width: dot,
                height: dot,
                // Centred on the first line of the label, not on the block.
                marginTop: Math.max(0, ((title.style.lineHeight ?? dot) - dot) / 2),
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
                    width: theme.space[2] + 2,
                    height: theme.space[2] + 2,
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
        <View accessibilityRole="menu" style={{ marginHorizontal: -theme.space[2] }}>
          {items.map((item) => {
            const ink = item.tone === "danger" ? theme.color.dangerFg : theme.color.text;
            return (
              <View key={item.key}>
                {item.separated ? (
                  <View
                    style={{
                      height: theme.edge.hairlineWidth,
                      marginVertical: theme.space[2],
                      marginHorizontal: theme.space[2],
                      backgroundColor: theme.color.line,
                    }}
                  />
                ) : null}
                <Pressable
                  accessibilityRole="menuitem"
                  accessibilityLabel={item.label}
                  accessibilityState={{ disabled: item.disabled }}
                  disabled={item.disabled}
                  onPress={() => {
                    setOpen(false);
                    item.onPress?.();
                  }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.space[3],
                    minHeight: theme.rowHeight.lg,
                    paddingHorizontal: theme.space[3],
                    borderRadius: theme.radius.md,
                    backgroundColor: pressed ? theme.color.pressed : undefined,
                    opacity: item.disabled ? DISABLED_OPACITY : 1,
                  })}
                >
                  <IconPaintProvider value={ink}>{renderIconSlot(item.icon, 20)}</IconPaintProvider>
                  <Text style={inkText(theme, { size: "md", weight: theme.weight.medium, color: ink }).style}>
                    {item.label}
                  </Text>
                </Pressable>
              </View>
            );
          })}
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
  const holding = useRef<0 | 1>(0);
  const [low, high] = value;
  const show = format ?? String;

  const set = (which: 0 | 1, next: number) => {
    if (which === 0) {
      const clamped = Math.max(min, Math.min(next, high));
      if (clamped !== low) onChange([clamped, high]);
    } else {
      const clamped = Math.min(max, Math.max(next, low));
      if (clamped !== high) onChange([low, clamped]);
    }
  };

  const { held, handlers } = useTrack((x, phase) => {
    const at = valueAt(x, { min, max, step, length: width, thumb: THUMB });
    // Claimed once, at the start, and held for the whole gesture.
    if (phase === "start") holding.current = Math.abs(at - low) <= Math.abs(at - high) ? 0 : 1;
    set(holding.current, at);
  }, disabled);

  const travel = Math.max(0, width - THUMB);
  const span = max - min || 1;
  const left = ((low - min) / span) * travel;
  const right = ((high - min) / span) * travel;

  return (
    <View
      accessibilityLabel={label}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      hitSlop={hitSlop(THUMB, theme.touch.tapMin)}
      style={[{ height: THUMB_BOX, justifyContent: "center", opacity: disabled ? DISABLED_OPACITY : 1 }, style]}
      {...handlers}
    >
      <View
        pointerEvents="none"
        style={{
          height: TRACK,
          marginHorizontal: THUMB / 2,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.line,
          borderWidth: theme.edge.hairlineWidth,
          borderColor: theme.color.lineStrong,
          overflow: "hidden",
        }}
      >
        <View
          style={{ marginLeft: left, width: Math.max(0, right - left), height: "100%", backgroundColor: theme.color.accent }}
        />
      </View>
      <Thumb
        left={left}
        held={held && holding.current === 0}
        label={`${label}, from`}
        value={{ min, max: high, now: low, text: show(low) }}
        onStep={(direction) => set(0, stepFrom(low, step, direction))}
      />
      <Thumb
        left={right}
        held={held && holding.current === 1}
        label={`${label}, to`}
        value={{ min: low, max, now: high, text: show(high) }}
        onStep={(direction) => set(1, stepFrom(high, step, direction))}
      />
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
          <Text style={inkText(theme, { size: "md", weight: theme.weight.bold, color: theme.color.dangerFg }).style}>
            {errors.length === 1 ? "One thing needs fixing" : `${errors.length} things need fixing`}
          </Text>
          {errors.map((error) => (
            <Text key={error.field} style={inkText(theme, { size: "sm", color: theme.color.dangerFg }).style}>
              {error.message}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={{ gap: theme.space[5] }}>{children}</View>
      {actions ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: theme.space[3] }}>
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
      <View style={{ gap: 2 }}>
        <Text style={inkText(theme, { size: "md", weight: theme.weight.semibold, leading: "snug" }).style}>
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
      </View>
      {children}
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={inkText(theme, { size: "sm", weight: theme.weight.semibold, color: theme.color.dangerFg }).style}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
