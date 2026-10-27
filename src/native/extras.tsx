/**
 * The rest of the surface, on native. Same names and props as the React
 * bindings; the presentation differs only where the platform forces it.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { filterItems, highlight } from "../headless/filter.js";
import { pageSlots } from "../headless/pagination.js";
import { edgeStateFor } from "../core/edge.js";
import { hitSlop } from "../core/reach.js";
import { toneColors, type InkTone } from "../core/tone.js";
import { DISABLED_OPACITY, controlPadX } from "../tokens/control.js";
import { SPRING } from "../tokens/motion.js";
import { fieldFrame, singleLine } from "./field.js";
import { Glyph } from "./glyph.js";
import { IconPaintProvider, renderIconSlot, type InkIconSlot } from "./icon.js";
import { InkEdge } from "./InkEdge.js";
import { useInkInsets, useInkTheme } from "./InkProvider.js";
import { InkAvatar, InkSpinner } from "./feedback.js";
import { springTo } from "./motion.js";
import { OVERLAY_WIDTH, Overlay } from "./overlay.js";
import { inkText } from "./type.js";

/* ── Chip ──────────────────────────────────────────────────────────────────
 * A thing in its own right, not a fact about something else. The remove
 * control is separate so a chip you meant to select never vanishes instead.
 */

export interface InkChipProps {
  tone?: InkTone;
  icon?: InkIconSlot;
  onPress?: () => void;
  onRemove?: () => void;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function InkChip({
  tone = "neutral",
  icon,
  onPress,
  onRemove,
  selected,
  disabled,
  style,
  children,
}: InkChipProps) {
  const theme = useInkTheme();
  const colours = toneColors(tone, theme.color);
  const label = typeof children === "string" ? children : undefined;
  const text = inkText(theme, {
    size: "base",
    weight: theme.weight.medium,
    color: selected ? colours.fg : theme.color.text,
  });

  const [pressed, setPressed] = useState<"body" | "remove" | null>(null);
  const Body = onPress ? Pressable : View;
  const padX = controlPadX("sm", "pill");

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          minHeight: 32,
          borderWidth: theme.edge.hairlineWidth,
          borderColor: selected ? colours.fg : theme.color.lineStrong,
          borderRadius: theme.radius.pill,
          backgroundColor:
            pressed === "body" ? theme.color.pressed : selected ? colours.soft : theme.color.surface,
          opacity: disabled ? DISABLED_OPACITY : 1,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Body
        {...(onPress
          ? {
              accessibilityRole: "button" as const,
              accessibilityState: { selected, disabled },
              disabled,
              onPress,
              onPressIn: () => setPressed("body"),
              onPressOut: () => setPressed(null),
              hitSlop: hitSlop(32, theme.touch.tapMin),
            }
          : {})}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.space[2],
          minHeight: 30,
          paddingLeft: icon ? padX - theme.space[1] : padX,
          paddingRight: onRemove ? theme.space[1] : padX,
        }}
      >
        <IconPaintProvider value={selected ? colours.fg : theme.color.textSecondary}>
          {renderIconSlot(icon, 16)}
        </IconPaintProvider>
        <Text style={text.style}>{children}</Text>
      </Body>

      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label ? `Remove ${label}` : "Remove"}
          disabled={disabled}
          onPress={onRemove}
          onPressIn={() => setPressed("remove")}
          onPressOut={() => setPressed(null)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          style={{
            width: 24,
            height: 24,
            marginRight: theme.space[1],
            alignItems: "center",
            justifyContent: "center",
            borderRadius: theme.radius.pill,
            backgroundColor: pressed === "remove" ? theme.color.pressed : undefined,
          }}
        >
          <Glyph name="x" size={14} paint={theme.color.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ── Text ──────────────────────────────────────────────────────────────── */

export function InkText({
  size = "md",
  weight,
  tone,
  mono,
  numeric,
  numberOfLines,
  style,
  children,
}: {
  as?: string;
  size?: "xs" | "sm" | "base" | "md" | "lg" | "xl";
  weight?: "regular" | "medium" | "semibold" | "bold";
  tone?: "default" | "secondary" | "tertiary";
  mono?: boolean;
  numeric?: boolean;
  /** Truncate with an ellipsis after this many lines. */
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
}) {
  const theme = useInkTheme();
  const resolved = inkText(theme, {
    role: mono ? "mono" : "body",
    size,
    weight: weight ? theme.weight[weight] : undefined,
    color:
      tone === "secondary"
        ? theme.color.textSecondary
        : tone === "tertiary"
          ? theme.color.textTertiary
          : theme.color.text,
  });
  // `fontVariant` is the native spelling of tabular figures.
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[resolved.style, numeric ? { fontVariant: ["tabular-nums"] } : null, style]}
    >
      {children}
    </Text>
  );
}

/* ── Link ──────────────────────────────────────────────────────────────────
 * Underlined by default: a link marked only by colour is invisible to a reader
 * who cannot distinguish it, and inside a paragraph nothing else marks it.
 */

export function InkLink({
  onPress,
  standalone,
  external,
  style,
  children,
}: {
  href?: string;
  onPress?: () => void;
  standalone?: boolean;
  external?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const theme = useInkTheme();
  const text = inkText(theme, {
    size: "md",
    weight: standalone ? theme.weight.semibold : theme.weight.regular,
    color: standalone ? theme.color.text : theme.color.accentLine,
  });
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityHint={external ? "Opens outside the app" : undefined}
      onPress={onPress}
      hitSlop={hitSlop(text.style.lineHeight ?? 22, theme.touch.tapMin)}
      style={({ pressed }) => [
        { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", opacity: pressed ? 0.6 : 1 },
        style,
      ]}
    >
      <Text style={[text.style, standalone ? null : { textDecorationLine: "underline" }]}>{children}</Text>
      {external ? <Glyph name="arrow-up-right" size={14} paint={text.style.color as string} /> : null}
    </Pressable>
  );
}

/* ── Surface & container ───────────────────────────────────────────────── */

export function InkSurface({
  tone = "surface",
  padded = true,
  style,
  children,
}: {
  tone?: "surface" | "content" | "chrome";
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const theme = useInkTheme();
  const fill =
    tone === "content" ? theme.color.content : tone === "chrome" ? theme.color.chrome : theme.color.surface;
  return (
    <View style={[{ borderRadius: theme.radius.lg, padding: padded ? theme.space[4] : 0, backgroundColor: fill }, style]}>
      {children}
    </View>
  );
}

export function InkContainer({
  width = "content",
  style,
  children,
}: {
  width?: "prose" | "content" | "wide" | "full";
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const theme = useInkTheme();
  const max =
    width === "prose"
      ? theme.measure.prose
      : width === "content"
        ? theme.measure.content
        : width === "wide"
          ? 1200
          : undefined;
  return (
    <View style={[{ width: "100%", alignSelf: "center", maxWidth: max, paddingHorizontal: theme.space[4] }, style]}>
      {children}
    </View>
  );
}

/* ── List item ─────────────────────────────────────────────────────────────
 * A record, not a setting: leading slot, two lines, trailing slot.
 */

export function InkListItem({
  lead,
  title,
  description,
  trail,
  onPress,
  selected,
  disabled,
  style,
}: {
  lead?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  trail?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const titleStyle = inkText(theme, { size: "md", weight: theme.weight.semibold });
  const descStyle = inkText(theme, { size: "sm", color: theme.color.textSecondary });
  const [pressed, setPressed] = useState(false);
  const Row = onPress ? Pressable : View;

  return (
    <Row
      {...(onPress
        ? {
            accessibilityRole: "button" as const,
            accessibilityState: { selected, disabled },
            disabled,
            onPress,
            onPressIn: () => setPressed(true),
            onPressOut: () => setPressed(false),
          }
        : {})}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.space[3],
          minHeight: theme.rowHeight.lg,
          paddingVertical: theme.space[3],
          paddingHorizontal: theme.space[4],
          backgroundColor: pressed
            ? theme.color.pressed
            : selected
              ? theme.color.accentSoft
              : "transparent",
          opacity: disabled ? DISABLED_OPACITY : 1,
        },
        style,
      ]}
    >
      {lead}
      <View style={{ flexShrink: 1, gap: 2 }}>
        {typeof title === "string" ? <Text style={titleStyle.style}>{title}</Text> : title}
        {typeof description === "string" ? (
          <Text style={descStyle.style}>{description}</Text>
        ) : (
          description
        )}
      </View>
      {/* A spacer rather than `marginLeft: auto`: it is the RN idiom, and it
          keeps the trailing slot pinned even when the text wraps. */}
      {trail ? <View style={{ flex: 1 }} /> : null}
      {trail}
    </Row>
  );
}

/* ── Accordion ─────────────────────────────────────────────────────────────
 *
 * There is no `<details>` here, so this is state — and that is the one place
 * the two renderers genuinely diverge underneath. The web version keeps
 * find-in-page reaching inside a closed panel; this cannot, and no amount of
 * work makes it.
 */

export interface InkAccordionItem {
  key: string;
  title: ReactNode;
  meta?: ReactNode;
  disabled?: boolean;
  content: ReactNode;
}

export function InkAccordion({
  label,
  items,
  single,
  defaultOpen = [],
  style,
}: {
  label: string;
  items: InkAccordionItem[];
  single?: boolean;
  defaultOpen?: string[];
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState<string[]>(defaultOpen);

  return (
    <View accessibilityLabel={label} style={style}>
      {items.map((item) => (
        <AccordionRow
          key={item.key}
          item={item}
          open={open.includes(item.key)}
          onToggle={(isOpen) =>
            setOpen((current) =>
              isOpen ? current.filter((k) => k !== item.key) : single ? [item.key] : [...current, item.key],
            )
          }
        />
      ))}
    </View>
  );
}

function AccordionRow({
  item,
  open,
  onToggle,
}: {
  item: InkAccordionItem;
  open: boolean;
  onToggle: (wasOpen: boolean) => void;
}) {
  const theme = useInkTheme();
  const turn = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    if (!theme.animate) {
      turn.setValue(open ? 1 : 0);
      return;
    }
    const animation = springTo(turn, open ? 1 : 0, { spring: SPRING.snappy, rest: 0.001 });
    animation.start();
    return () => animation.stop();
  }, [open, turn, theme.animate]);

  return (
    <View style={{ borderBottomWidth: theme.edge.hairlineWidth, borderColor: theme.color.line }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled: item.disabled }}
        disabled={item.disabled}
        onPress={() => onToggle(open)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: theme.space[3],
          minHeight: theme.rowHeight.lg,
          paddingVertical: theme.space[3],
          opacity: item.disabled ? DISABLED_OPACITY : pressed ? 0.6 : 1,
        })}
      >
        <View style={{ flex: 1 }}>
          {typeof item.title === "string" ? (
            <Text style={inkText(theme, { size: "md", weight: theme.weight.semibold }).style}>{item.title}</Text>
          ) : (
            item.title
          )}
        </View>
        {item.meta}
        <Animated.View
          style={{ transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}
        >
          <Glyph name="chevron-down" size={18} paint={theme.color.textSecondary} />
        </Animated.View>
      </Pressable>
      {open ? <View style={{ paddingBottom: theme.space[4] }}>{item.content}</View> : null}
    </View>
  );
}

/* ── Timeline ──────────────────────────────────────────────────────────── */

export interface InkTimelineEntry {
  key: string;
  time?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  state?: "done" | "current" | "todo";
}

export function InkTimeline({
  label,
  entries,
  style,
}: {
  label: string;
  entries: InkTimelineEntry[];
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  return (
    <View accessibilityLabel={label} style={style}>
      {entries.map((entry, i) => {
        const state = entry.state ?? "done";
        const last = i === entries.length - 1;
        return (
          <View key={entry.key} style={{ flexDirection: "row", gap: theme.space[4], paddingBottom: theme.space[5] }}>
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 16,
                  height: 16,
                  marginTop: 3,
                  borderWidth: theme.edge.borderWidth,
                  borderRadius: theme.radius.pill,
                  borderColor:
                    state === "todo" ? theme.color.lineStrong : state === "current" ? theme.color.accentLine : theme.color.edge,
                  backgroundColor:
                    state === "todo" ? theme.color.surface : state === "current" ? theme.color.accent : theme.color.edge,
                }}
              />
              {/* The rule stops at the last marker rather than trailing off. */}
              {last ? null : (
                <View style={{ flex: 1, width: theme.edge.borderWidth, backgroundColor: theme.color.line, marginTop: 4 }} />
              )}
            </View>
            <View style={{ flexShrink: 1, gap: 2 }}>
              {typeof entry.time === "string" ? (
                <Text
                  style={
                    inkText(theme, {
                      role: "mono",
                      size: "xs",
                      weight: theme.weight.bold,
                      tracking: "eyebrow",
                      uppercase: true,
                      color: theme.color.textTertiary,
                    }).style
                  }
                >
                  {entry.time}
                </Text>
              ) : (
                entry.time
              )}
              {typeof entry.title === "string" ? (
                <Text style={inkText(theme, { size: "md", weight: theme.weight.semibold }).style}>
                  {entry.title}
                </Text>
              ) : (
                entry.title
              )}
              {typeof entry.description === "string" ? (
                <Text style={inkText(theme, { size: "sm", color: theme.color.textSecondary }).style}>
                  {entry.description}
                </Text>
              ) : (
                entry.description
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ── Search field ──────────────────────────────────────────────────────────
 * Not debounced. Debouncing is a decision about a network, and a component
 * that makes it for you is one you fight when the data is local.
 */

export function InkSearchField({
  value,
  onChange,
  label = "Search",
  placeholder = "Search",
  onSubmit,
  disabled,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  onSubmit?: (value: string) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const [focused, setFocused] = useState(false);
  const field = inkText(theme, { size: "md" });
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.space[2],
          minHeight: theme.touch.tapMin,
          opacity: disabled ? DISABLED_OPACITY : 1,
        },
        fieldFrame(theme, { focused }, theme.space[3] + 2),
        { borderRadius: theme.radius.pill },
        style,
      ]}
    >
      <Glyph name="search" size={18} paint={theme.color.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor={theme.color.textTertiary}
        keyboardType="web-search"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={theme.color.accentLine}
        cursorColor={theme.color.accentLine}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={() => onSubmit?.(value)}
        accessibilityLabel={label}
        style={[singleLine(field.style), { flex: 1, alignSelf: "stretch" }]}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChange("")}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 22,
            height: 22,
            marginRight: -2,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: theme.radius.pill,
            backgroundColor: pressed ? theme.color.lineStrong : theme.color.line,
          })}
        >
          <Glyph name="x" size={14} paint={theme.color.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ── Autocomplete ──────────────────────────────────────────────────────────
 * Same ranking as the web: prefix beats word-start beats mid-word, so typing
 * "se" offers "Settings" before "Voice sensitivity".
 */

export function InkAutocomplete<T>({
  label,
  value,
  onChange,
  items,
  labelOf,
  onSelect,
  placeholder,
  limit = 8,
  empty = "Nothing matches",
  disabled,
  style,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: T[];
  labelOf: (item: T) => string;
  onSelect: (item: T) => void;
  placeholder?: string;
  limit?: number;
  empty?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const matches = useMemo(
    () => (value.trim() ? filterItems(items, value, labelOf, limit) : []),
    [items, value, labelOf, limit],
  );

  return (
    <View style={style}>
      <InkSearchField
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
      {value.trim() ? (
        <View
          style={{
            marginTop: theme.space[2],
            padding: theme.space[1],
            borderWidth: theme.edge.borderWidth,
            borderColor: theme.color.edge,
            borderRadius: theme.radius.md,
            backgroundColor: theme.color.surface,
          }}
        >
          {matches.length === 0 ? (
            <Text
              style={[
                inkText(theme, { size: "sm", color: theme.color.textSecondary }).style,
                { padding: theme.space[3] },
              ]}
            >
              {empty}
            </Text>
          ) : (
            // Without "handled" the first tap on a suggestion only dismisses
            // the keyboard, and the reader has to tap the same row again.
            <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
              {matches.map((match, i) => (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  onPress={() => onSelect(match.item)}
                  style={({ pressed }) => ({
                    minHeight: theme.touch.tapMin,
                    justifyContent: "center",
                    paddingHorizontal: theme.space[3],
                    borderRadius: theme.radius.sm,
                    backgroundColor: pressed ? theme.color.pressed : undefined,
                  })}
                >
                  <Text style={inkText(theme, { size: "base" }).style}>
                    {highlight(labelOf(match.item), match.ranges).map((part, j) => (
                      <Text
                        key={j}
                        style={
                          part.match
                            ? inkText(theme, {
                                size: "base",
                                weight: theme.weight.bold,
                                color: theme.color.accentLine,
                              }).style
                            : undefined
                        }
                      >
                        {part.text}
                      </Text>
                    ))}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
}

/* ── Number field ──────────────────────────────────────────────────────── */

export function InkNumberField({
  label,
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  suffix,
  disabled,
  style,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const round = (n: number) => {
    const places = (String(step).split(".")[1] ?? "").length;
    return places ? Number(n.toFixed(places)) : n;
  };
  const stepper = (glyph: "minus" | "plus", name: string, blocked: boolean, next: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name} ${label}`}
      accessibilityState={{ disabled: blocked }}
      disabled={blocked}
      onPress={() => onChange(clamp(round(next)))}
      style={({ pressed }) => ({
        width: theme.touch.tapMin,
        alignSelf: "stretch",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? theme.color.pressed : undefined,
        opacity: blocked && !disabled ? DISABLED_OPACITY : 1,
      })}
    >
      <Glyph name={glyph} size={18} paint={theme.color.text} />
    </Pressable>
  );

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          minHeight: theme.touch.tapMin,
          overflow: "hidden",
          alignSelf: "flex-start",
          opacity: disabled ? DISABLED_OPACITY : 1,
        },
        fieldFrame(theme, { focused }, 0),
        style,
      ]}
    >
      {stepper("minus", "Decrease", Boolean(disabled) || value <= min, value - step)}
      <View style={{ width: theme.edge.hairlineWidth, alignSelf: "stretch", backgroundColor: theme.color.line }} />
      <TextInput
        // A draft while typing, so "1." or an emptied field is not snapped back
        // to a number under the caret.
        value={draft ?? String(value)}
        keyboardType="numeric"
        editable={!disabled}
        accessibilityLabel={label}
        selectionColor={theme.color.accentLine}
        cursorColor={theme.color.accentLine}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setDraft(null);
        }}
        onChangeText={(t) => {
          setDraft(t);
          const next = Number(t);
          if (t.trim() !== "" && !Number.isNaN(next)) onChange(clamp(next));
        }}
        style={[
          singleLine(inkText(theme, { role: "mono", size: "md", weight: theme.weight.semibold }).style),
          { minWidth: 56, alignSelf: "stretch", textAlign: "center", fontVariant: ["tabular-nums"] },
        ]}
      />
      {suffix ? <View style={{ paddingRight: theme.space[2] }}>{suffix}</View> : null}
      <View style={{ width: theme.edge.hairlineWidth, alignSelf: "stretch", backgroundColor: theme.color.line }} />
      {stepper("plus", "Increase", Boolean(disabled) || value >= max, value + step)}
    </View>
  );
}

/* ── Rating ────────────────────────────────────────────────────────────────
 * A ring that fills rather than a star: the library draws its own marks so it
 * needs no icon set, and a filled ring is unambiguous at 14px.
 */

export function InkRating({
  label,
  value,
  onChange,
  max = 5,
  readOnly,
  style,
}: {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  readOnly?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const mark = (on: boolean): ViewStyle => ({
    width: 14,
    height: 14,
    borderWidth: theme.edge.borderWidth,
    borderRadius: theme.radius.pill,
    borderColor: on ? theme.color.edge : theme.color.textTertiary,
    backgroundColor: on ? theme.color.accent : "transparent",
  });

  if (readOnly || !onChange) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={`${label}: ${value} out of ${max}`}
        style={[{ flexDirection: "row", gap: 3 }, style]}
      >
        {Array.from({ length: max }, (_, i) => (
          <View key={i} style={mark(i < value)} />
        ))}
      </View>
    );
  }

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[{ flexDirection: "row", gap: 2 }, style]}
    >
      {Array.from({ length: max }, (_, i) => (
        <Pressable
          key={i}
          accessibilityRole="radio"
          accessibilityLabel={`${i + 1} out of ${max}`}
          accessibilityState={{ checked: i + 1 === value }}
          onPress={() => onChange(i + 1 === value ? 0 : i + 1)}
          style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
        >
          <View style={mark(i < value)} />
        </Pressable>
      ))}
    </View>
  );
}

/* ── Button group ──────────────────────────────────────────────────────────
 * Presentational only: a group of actions has no selection, and a group of
 * values is `InkSegmented`.
 */

export function InkButtonGroup({
  label,
  orientation = "horizontal",
  children,
  style,
}: {
  label: string;
  orientation?: "horizontal" | "vertical";
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityLabel={label}
      style={[{ flexDirection: orientation === "vertical" ? "column" : "row" }, style]}
    >
      {children}
    </View>
  );
}

/* ── Pagination ────────────────────────────────────────────────────────────
 * `pageSlots` keeps the control a constant width wherever the page is, so the
 * "next" control does not move between presses.
 */

export function InkPagination({
  label = "Pagination",
  page,
  count,
  onChange,
  max = 7,
  style,
}: {
  label?: string;
  page: number;
  count: number;
  onChange: (page: number) => void;
  max?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const slots = pageSlots(page, count, { max });
  const cell = (pressed: boolean): ViewStyle => ({
    minWidth: theme.touch.tapMin,
    height: theme.touch.tapMin,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: pressed ? theme.color.pressed : undefined,
  });

  return (
    <View
      accessibilityLabel={label}
      style={[{ flexDirection: "row", alignItems: "center", gap: theme.space[1], flexWrap: "wrap" }, style]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous page"
        accessibilityState={{ disabled: page <= 1 }}
        disabled={page <= 1}
        onPress={() => onChange(page - 1)}
        style={({ pressed }) => [cell(pressed), { opacity: page <= 1 ? DISABLED_OPACITY : 1 }]}
      >
        <Glyph name="chevron-left" size={20} paint={theme.color.text} />
      </Pressable>

      {slots.map((slot, i) =>
        slot === "gap" ? (
          <View key={`gap-${i}`} style={{ minWidth: theme.space[6], alignItems: "center" }}>
            <Text style={inkText(theme, { color: theme.color.textTertiary }).style}>&hellip;</Text>
          </View>
        ) : (
          <Pressable
            key={slot}
            accessibilityRole="button"
            accessibilityLabel={`Page ${slot}`}
            accessibilityState={{ selected: slot === page }}
            onPress={() => onChange(slot)}
            style={({ pressed }) => [cell(pressed), slot === page ? { backgroundColor: theme.color.accent } : null]}
          >
            <Text
              style={[
                inkText(theme, {
                  size: "base",
                  weight: theme.weight.semibold,
                  color: slot === page ? theme.color.textOnAccent : theme.color.textSecondary,
                }).style,
                { fontVariant: ["tabular-nums"] },
              ]}
            >
              {slot}
            </Text>
          </Pressable>
        ),
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next page"
        accessibilityState={{ disabled: page >= count }}
        disabled={page >= count}
        onPress={() => onChange(page + 1)}
        style={({ pressed }) => [cell(pressed), { opacity: page >= count ? DISABLED_OPACITY : 1 }]}
      >
        <Glyph name="chevron-right" size={20} paint={theme.color.text} />
      </Pressable>
    </View>
  );
}

/* ── Stepper ───────────────────────────────────────────────────────────────
 * Going back is always allowed; skipping ahead is the product's decision.
 */

export interface InkStep {
  key: string;
  label: string;
  description?: ReactNode;
}

export function InkStepper({
  label,
  steps,
  current,
  onChange,
  orientation = "horizontal",
  style,
}: {
  label: string;
  steps: InkStep[];
  current: number;
  onChange?: (index: number) => void;
  orientation?: "horizontal" | "vertical";
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const horizontal = orientation === "horizontal";

  return (
    <View
      accessibilityLabel={label}
      style={[{ flexDirection: horizontal ? "row" : "column", gap: theme.space[2] }, style]}
    >
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        const reachable = !!onChange && i < current;
        return (
          <Pressable
            key={step.key}
            accessibilityRole={reachable ? "button" : "none"}
            accessibilityLabel={`${step.label}, step ${i + 1} of ${steps.length}`}
            accessibilityState={{ selected: state === "current", disabled: !reachable }}
            disabled={!reachable}
            onPress={() => onChange?.(i)}
            style={{
              flex: horizontal ? 1 : undefined,
              flexDirection: horizontal ? "column" : "row",
              alignItems: horizontal ? "center" : "flex-start",
              gap: theme.space[2],
            }}
          >
            <View
              style={{
                width: theme.space[8],
                height: theme.space[8],
                alignItems: "center",
                justifyContent: "center",
                borderWidth: theme.edge.borderWidth,
                borderRadius: theme.radius.pill,
                borderColor: state === "todo" ? theme.color.lineStrong : theme.color.edge,
                backgroundColor:
                  state === "done" ? theme.color.edge : state === "current" ? theme.color.accent : theme.color.surface,
              }}
            >
              {state === "done" ? (
                <Glyph name="check" size={16} paint={theme.color.surface} />
              ) : (
                <Text
                  style={
                    inkText(theme, {
                      role: "mono",
                      size: "sm",
                      weight: theme.weight.bold,
                      color: state === "current" ? theme.color.textOnAccent : theme.color.textSecondary,
                    }).style
                  }
                >
                  {String(i + 1)}
                </Text>
              )}
            </View>
            <View style={{ flexShrink: 1, gap: 2, alignItems: horizontal ? "center" : "flex-start" }}>
              <Text
                style={
                  inkText(theme, {
                    size: "base",
                    weight: theme.weight.semibold,
                    color: state === "todo" ? theme.color.textSecondary : theme.color.text,
                  }).style
                }
              >
                {step.label}
              </Text>
              {typeof step.description === "string" ? (
                <Text style={inkText(theme, { size: "sm", color: theme.color.textSecondary }).style}>
                  {step.description}
                </Text>
              ) : (
                step.description
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Fab ───────────────────────────────────────────────────────────────────
 * Wears the edge, because a fab is the thing the screen is FOR — content
 * rather than chrome, and the one floating control that earns the plate.
 */

export function InkFab({
  label,
  icon,
  onPress,
  extended,
  position = "bottom-end",
  disabled,
  style,
}: {
  label: string;
  icon?: InkIconSlot;
  onPress?: () => void;
  extended?: boolean;
  position?: "bottom-end" | "bottom-start" | "static";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const insets = useInkInsets();
  const [pressed, setPressed] = useState(false);
  const fixed: ViewStyle =
    position === "static"
      ? { alignSelf: "flex-start" }
      : {
          position: "absolute",
          bottom: insets.bottom + theme.space[5],
          [position === "bottom-end" ? "right" : "left"]: theme.space[5],
        };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[fixed, style, disabled ? { opacity: DISABLED_OPACITY } : null]}
    >
      <InkEdge
        radius={theme.radius.pill}
        edge={theme.edgeCompact}
        state={edgeStateFor("native", { pressed: pressed && !disabled })}
        contentStyle={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.space[2],
          width: extended ? undefined : 56,
          height: 56,
          paddingHorizontal: extended ? theme.space[5] : 0,
          backgroundColor: pressed ? theme.color.accentPressed : theme.color.accent,
        }}
      >
        <IconPaintProvider value={theme.color.textOnAccent}>
          {renderIconSlot(icon, 24) ?? <Glyph name="plus" size={24} />}
          {extended ? (
            <Text style={inkText(theme, { size: "md", weight: theme.weight.bold, color: theme.color.textOnAccent }).style}>
              {label}
            </Text>
          ) : null}
        </IconPaintProvider>
      </InkEdge>
    </Pressable>
  );
}

/* ── Speed dial ────────────────────────────────────────────────────────────
 * Only the mark turns, plus into close. Turning the whole button would spin
 * its plate with it, and the plate is the one thing that never moves.
 */

export function InkSpeedDial({
  label,
  actions,
  icon,
  position = "bottom-end",
  style,
}: {
  label: string;
  actions: { key: string; label: string; icon?: InkIconSlot; onPress?: () => void }[];
  icon?: InkIconSlot;
  position?: "bottom-end" | "bottom-start" | "static";
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const insets = useInkInsets();
  const [open, setOpen] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!theme.animate) {
      spin.setValue(open ? 1 : 0);
      return;
    }
    const animation = springTo(spin, open ? 1 : 0, { rest: 0.001 });
    animation.start();
    return () => animation.stop();
  }, [open, spin, theme.animate]);

  const end = position !== "bottom-start";
  const fixed: ViewStyle =
    position === "static"
      ? {}
      : {
          position: "absolute",
          bottom: insets.bottom + theme.space[5],
          [end ? "right" : "left"]: theme.space[5],
        };

  return (
    <View style={[{ alignItems: end ? "flex-end" : "flex-start", gap: theme.space[3] }, fixed, style]}>
      {open ? (
        <View
          accessibilityRole="menu"
          accessibilityLabel={label}
          style={{ alignItems: end ? "flex-end" : "flex-start", gap: theme.space[2] }}
        >
          {actions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="menuitem"
              accessibilityLabel={action.label}
              onPress={() => {
                setOpen(false);
                action.onPress?.();
              }}
              style={({ pressed }) => ({
                flexDirection: end ? "row" : "row-reverse",
                alignItems: "center",
                gap: theme.space[3],
                // Lined up on the fab's centre, not its leading edge.
                marginHorizontal: (56 - theme.touch.tapMin) / 2,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  paddingVertical: theme.space[1],
                  paddingHorizontal: theme.space[3],
                  borderRadius: theme.radius.sm,
                  borderWidth: theme.edge.hairlineWidth,
                  borderColor: theme.color.lineStrong,
                  backgroundColor: theme.color.surface,
                }}
              >
                <Text style={inkText(theme, { size: "sm", weight: theme.weight.semibold }).style}>
                  {action.label}
                </Text>
              </View>
              <View
                style={{
                  width: theme.touch.tapMin,
                  height: theme.touch.tapMin,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: theme.edge.borderWidth,
                  borderColor: theme.color.edge,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.color.surface,
                }}
              >
                {renderIconSlot(action.icon, 20)}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      <InkFab
        label={label}
        position="static"
        onPress={() => setOpen((o) => !o)}
        icon={
          <Animated.View
            style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] }) }] }}
          >
            {renderIconSlot(icon, 24) ?? <Glyph name="plus" size={24} />}
          </Animated.View>
        }
      />
    </View>
  );
}

/* ── Drawer ────────────────────────────────────────────────────────────────
 * A drawer holds navigation or tools and is dismissed by going back to what
 * you were doing; a sheet holds a decision and is dismissed by answering it.
 */

export function InkDrawer({
  label,
  open,
  onClose,
  side = "start",
  size = "auto",
  children,
  style,
}: {
  label: string;
  open: boolean;
  onClose: () => void;
  side?: "start" | "end" | "bottom";
  size?: "auto" | "full";
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const insets = useInkInsets();
  const bottom = side === "bottom";
  const full = size === "full";
  const radius = full ? 0 : theme.radius["2xl"];
  const gutter = theme.space[5];
  // Only the edge it meets carries the landscape notch; a bottom drawer is
  // already kept clear of it by the frame.
  const left = !bottom && (full || side === "start") ? insets.left : 0;
  const right = !bottom && (full || side === "end") ? insets.right : 0;

  return (
    <Overlay
      open={open}
      onDismiss={onClose}
      placement={bottom ? "bottom" : side === "end" ? "end" : "start"}
      draggable={bottom}
      header={
        bottom ? (
          <View style={{ paddingTop: theme.space[2], paddingBottom: theme.space[3] }}>
            <View
              style={{
                alignSelf: "center",
                width: 36,
                height: 5,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.color.textDisabled,
              }}
            />
          </View>
        ) : undefined
      }
      panelStyle={[
        {
          // Keys left out rather than set undefined: an undefined here cancels
          // the shell's own width and cap, and 360 ran off a 320 phone.
          ...(bottom ? null : { width: full ? ("100%" as const) : OVERLAY_WIDTH.drawer + left + right }),
          ...(full ? { maxWidth: "100%" as const } : null),
          paddingTop: bottom ? 0 : insets.top + gutter,
          paddingBottom: bottom ? undefined : insets.bottom + gutter,
          borderWidth: full ? 0 : theme.edge.borderWidth,
          borderColor: theme.color.edge,
          backgroundColor: theme.color.surface,
          borderTopLeftRadius: bottom || side === "end" ? radius : 0,
          borderTopRightRadius: bottom || side === "start" ? radius : 0,
          borderBottomLeftRadius: side === "end" ? radius : 0,
          borderBottomRightRadius: side === "start" ? radius : 0,
          borderBottomWidth: bottom || full ? 0 : theme.edge.borderWidth,
          borderLeftWidth: side === "start" || full ? 0 : theme.edge.borderWidth,
          borderRightWidth: side === "end" || full ? 0 : theme.edge.borderWidth,
        },
        style,
      ]}
    >
      {/* The web drawer scrolls its panel the same way. */}
      <ScrollView
        accessibilityLabel={label}
        keyboardShouldPersistTaps="handled"
        alwaysBounceVertical={false}
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{ gap: theme.space[4], paddingLeft: gutter + left, paddingRight: gutter + right }}
      >
        {children}
      </ScrollView>
    </Overlay>
  );
}

/* ── Backdrop ──────────────────────────────────────────────────────────────
 * Rare on purpose: it says "you can do nothing until this finishes", which is
 * true far less often than it is used. The words sit on a card rather than on
 * the scrim, where white measured 2.8:1 over a light page.
 */

export function InkBackdrop({
  open,
  label,
  children,
  onPress,
}: {
  open: boolean;
  label: string;
  children?: ReactNode;
  onPress?: () => void;
}) {
  const theme = useInkTheme();
  return (
    <Overlay
      open={open}
      onDismiss={onPress}
      placement="center"
      panelStyle={{ width: "auto", maxWidth: 320, alignSelf: "center" }}
    >
      <View
        accessibilityRole="alert"
        accessibilityLabel={label}
        accessibilityState={{ busy: true }}
        style={{
          alignItems: "center",
          gap: theme.space[3],
          paddingVertical: theme.space[5],
          paddingHorizontal: theme.space[6],
          borderWidth: theme.edge.borderWidth,
          borderColor: theme.color.edge,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.color.surface,
        }}
      >
        {children ?? <InkSpinner label="" size={28} />}
        <Text style={[inkText(theme, { size: "md", weight: theme.weight.semibold }).style, { textAlign: "center" }]}>
          {label}
        </Text>
      </View>
    </Overlay>
  );
}

/* ── Avatar group ──────────────────────────────────────────────────────────
 * The overflow is a number, not more faces: past four the faces stop being
 * recognisable and start being texture.
 */

export function InkAvatarGroup({
  label,
  people,
  max = 4,
  size = 32,
  style,
}: {
  label: string;
  people: { name: string; src?: string }[];
  max?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  const ring = theme.edge.borderWidth;

  return (
    <View
      accessibilityLabel={`${label}: ${people.map((p) => p.name).join(", ")}`}
      style={[{ flexDirection: "row", alignItems: "center" }, style]}
    >
      {shown.map((person, i) => (
        // A ring in the page colour, so overlapping faces read as a stack
        // rather than as one shape with a bite out of it.
        <View
          key={person.name}
          style={{
            marginLeft: i === 0 ? 0 : -Math.round(size * 0.28),
            borderWidth: ring,
            borderColor: theme.color.surface,
            borderRadius: (size + ring * 2) / 2,
          }}
        >
          <InkAvatar name={person.name} src={person.src} size={size} />
        </View>
      ))}
      {rest > 0 ? (
        <View
          style={{
            marginLeft: -Math.round(size * 0.28),
            width: size + ring * 2,
            height: size + ring * 2,
            borderRadius: (size + ring * 2) / 2,
            borderWidth: ring,
            borderColor: theme.color.surface,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.color.neutralSoft,
          }}
        >
          <Text
            style={[
              inkText(theme, {
                role: "mono",
                weight: theme.weight.bold,
                color: theme.color.textSecondary,
              }).style,
              { fontSize: Math.round(size * 0.34), lineHeight: Math.round(size * 0.42) },
            ]}
          >
            +{rest}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* ── Tooltip ───────────────────────────────────────────────────────────────
 *
 * Long-press here, hover-and-focus on the web. That asymmetry is the reason
 * this was absent for so long, and it is stated rather than hidden: a tooltip
 * hides information a touch user may never look for.
 *
 * It never carries anything a reader NEEDS. For that, use `InkRow`'s
 * description or `InkFormField`'s hint, which are always visible.
 */

export function InkTooltip({
  content,
  placement = "top",
  children,
  style,
}: {
  content: string;
  placement?: "top" | "bottom";
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={[{ position: "relative" }, style]}>
      <Pressable
        // The content reaches assistive technology through the hint whether or
        // not the bubble is ever summoned.
        accessibilityHint={content}
        onLongPress={() => setOpen(true)}
        onPressOut={() => setOpen(false)}
      >
        {children}
      </Pressable>
      {open ? (
        <View
          accessibilityRole="none"
          style={{
            position: "absolute",
            left: 0,
            [placement === "top" ? "bottom" : "top"]: "100%",
            marginVertical: theme.space[2],
            maxWidth: 240,
            paddingVertical: theme.space[2],
            paddingHorizontal: theme.space[3],
            borderRadius: theme.radius.sm,
            backgroundColor: theme.color.text,
          }}
        >
          <Text style={inkText(theme, { size: "sm", color: theme.color.bg }).style}>{content}</Text>
        </View>
      ) : null}
    </View>
  );
}
