/**
 * The rest of the surface, on native. Same names and props as the React
 * bindings; the presentation differs only where the platform forces it.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Modal,
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
import { toneColors, type InkTone } from "../core/tone.js";
import { useInkTheme } from "./InkProvider.js";
import { InkAvatar, InkSpinner } from "./feedback.js";
import { inkText } from "./type.js";

/* ── Chip ──────────────────────────────────────────────────────────────────
 * A thing in its own right, not a fact about something else. The remove
 * control is separate so a chip you meant to select never vanishes instead.
 */

export interface InkChipProps {
  tone?: InkTone;
  icon?: ReactNode;
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

  const Body = onPress ? Pressable : View;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          minHeight: 32,
          borderWidth: theme.edge.hairlineWidth,
          borderColor: selected ? colours.fg : theme.color.lineStrong,
          borderRadius: theme.radius.pill,
          backgroundColor: selected ? colours.soft : theme.color.surface,
          opacity: disabled ? 0.5 : 1,
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
            }
          : {})}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.space[2],
          minHeight: 32,
          paddingHorizontal: onRemove ? theme.space[4] : theme.space[4],
          paddingRight: onRemove ? theme.space[1] : theme.space[4],
        }}
      >
        {icon}
        <Text style={text.style}>{children}</Text>
      </Body>

      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label ? `Remove ${label}` : "Remove"}
          disabled={disabled}
          onPress={onRemove}
          style={{
            width: theme.space[5],
            height: theme.space[5],
            marginRight: theme.space[1],
            alignItems: "center",
            justifyContent: "center",
            borderRadius: theme.radius.pill,
          }}
        >
          <Text style={inkText(theme, { color: theme.color.textTertiary }).style}>&times;</Text>
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
  style,
  children,
}: {
  as?: string;
  size?: "xs" | "sm" | "base" | "md" | "lg" | "xl";
  weight?: "regular" | "medium" | "semibold" | "bold";
  tone?: "default" | "secondary" | "tertiary";
  mono?: boolean;
  numeric?: boolean;
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
    <Text style={[resolved.style, numeric ? { fontVariant: ["tabular-nums"] } : null, style]}>
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
    color: standalone ? theme.color.text : theme.color.accentLine,
  });
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={style}>
      <Text style={[text.style, standalone ? null : { textDecorationLine: "underline" }]}>
        {children}
        {external ? " ↗" : ""}
      </Text>
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
  const Row = onPress ? Pressable : View;

  return (
    <Row
      {...(onPress
        ? { accessibilityRole: "button" as const, accessibilityState: { selected, disabled }, disabled, onPress }
        : {})}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.space[3],
          minHeight: 52,
          paddingVertical: theme.space[3],
          paddingHorizontal: theme.space[4],
          backgroundColor: selected ? theme.color.accentSoft : "transparent",
          opacity: disabled ? 0.5 : 1,
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
  const theme = useInkTheme();
  const [open, setOpen] = useState<string[]>(defaultOpen);

  return (
    <View accessibilityLabel={label} style={style}>
      {items.map((item) => {
        const isOpen = open.includes(item.key);
        return (
          <View key={item.key} style={{ borderBottomWidth: theme.edge.hairlineWidth, borderColor: theme.color.line }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen, disabled: item.disabled }}
              disabled={item.disabled}
              onPress={() =>
                setOpen((current) =>
                  isOpen
                    ? current.filter((k) => k !== item.key)
                    : single
                      ? [item.key]
                      : [...current, item.key],
                )
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.space[3],
                minHeight: 52,
                paddingVertical: theme.space[3],
              }}
            >
              <View style={{ flex: 1 }}>
                {typeof item.title === "string" ? (
                  <Text style={inkText(theme, { size: "md", weight: theme.weight.semibold }).style}>
                    {item.title}
                  </Text>
                ) : (
                  item.title
                )}
              </View>
              {item.meta}
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRightWidth: 2,
                  borderBottomWidth: 2,
                  borderColor: theme.color.textSecondary,
                  transform: [{ rotate: isOpen ? "-135deg" : "45deg" }],
                }}
              />
            </Pressable>
            {isOpen ? <View style={{ paddingBottom: theme.space[4] }}>{item.content}</View> : null}
          </View>
        );
      })}
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
  const field = inkText(theme, { size: "md" });
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.space[2],
          minHeight: theme.touch.tapMin,
          paddingHorizontal: theme.space[3],
          borderWidth: theme.edge.hairlineWidth,
          borderColor: theme.color.lineStrong,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.surface,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor={theme.color.textTertiary}
        keyboardType="web-search"
        onSubmitEditing={() => onSubmit?.(value)}
        accessibilityLabel={label}
        style={[field.style, { flex: 1, paddingVertical: theme.space[2] }]}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChange("")}
          style={{
            width: theme.space[5],
            height: theme.space[5],
            alignItems: "center",
            justifyContent: "center",
            borderRadius: theme.radius.pill,
            backgroundColor: theme.color.line,
          }}
        >
          <Text style={inkText(theme, { color: theme.color.textSecondary }).style}>&times;</Text>
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
            <ScrollView style={{ maxHeight: 260 }}>
              {matches.map((match, i) => (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  onPress={() => onSelect(match.item)}
                  style={{
                    minHeight: theme.touch.tapMin,
                    justifyContent: "center",
                    paddingHorizontal: theme.space[3],
                    borderRadius: theme.radius.sm,
                  }}
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
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const round = (n: number) => {
    const places = (String(step).split(".")[1] ?? "").length;
    return places ? Number(n.toFixed(places)) : n;
  };
  const stepStyle: ViewStyle = {
    width: theme.touch.tapMin,
    height: theme.touch.tapMin,
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          borderWidth: theme.edge.hairlineWidth,
          borderColor: theme.color.lineStrong,
          borderRadius: theme.radius.md,
          backgroundColor: theme.color.surface,
          overflow: "hidden",
          alignSelf: "flex-start",
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        disabled={disabled || value <= min}
        onPress={() => onChange(clamp(round(value - step)))}
        style={stepStyle}
      >
        <Text style={inkText(theme, { size: "lg", color: theme.color.textSecondary }).style}>&minus;</Text>
      </Pressable>
      <TextInput
        value={String(value)}
        keyboardType="numeric"
        editable={!disabled}
        accessibilityLabel={label}
        onChangeText={(t) => {
          const next = Number(t);
          if (t !== "" && !Number.isNaN(next)) onChange(clamp(next));
        }}
        style={[
          inkText(theme, { role: "mono", size: "md" }).style,
          { minWidth: 48, textAlign: "center" },
        ]}
      />
      {suffix}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        disabled={disabled || value >= max}
        onPress={() => onChange(clamp(round(value + step)))}
        style={stepStyle}
      >
        <Text style={inkText(theme, { size: "lg", color: theme.color.textSecondary }).style}>+</Text>
      </Pressable>
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
  const cell: ViewStyle = {
    minWidth: theme.touch.tapMin,
    height: theme.touch.tapMin,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
  };

  return (
    <View
      accessibilityLabel={label}
      style={[{ flexDirection: "row", alignItems: "center", gap: theme.space[1], flexWrap: "wrap" }, style]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous page"
        disabled={page <= 1}
        onPress={() => onChange(page - 1)}
        style={[cell, { opacity: page <= 1 ? 0.3 : 1 }]}
      >
        <Text style={inkText(theme, { size: "md", color: theme.color.textSecondary }).style}>&lsaquo;</Text>
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
            style={[cell, slot === page ? { backgroundColor: theme.color.accent } : null]}
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
        disabled={page >= count}
        onPress={() => onChange(page + 1)}
        style={[cell, { opacity: page >= count ? 0.3 : 1 }]}
      >
        <Text style={inkText(theme, { size: "md", color: theme.color.textSecondary }).style}>&rsaquo;</Text>
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
              <Text
                style={
                  inkText(theme, {
                    role: "mono",
                    size: "sm",
                    weight: theme.weight.bold,
                    color:
                      state === "done"
                        ? theme.color.surface
                        : state === "current"
                          ? theme.color.textOnAccent
                          : theme.color.textSecondary,
                  }).style
                }
              >
                {state === "done" ? "✓" : String(i + 1)}
              </Text>
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
  icon?: ReactNode;
  onPress?: () => void;
  extended?: boolean;
  position?: "bottom-end" | "bottom-start" | "static";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const fixed: ViewStyle =
    position === "static"
      ? {}
      : { position: "absolute", bottom: theme.space[6], [position === "bottom-end" ? "right" : "left"]: theme.space[6] };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.space[2],
          width: extended ? undefined : 56,
          height: 56,
          paddingHorizontal: extended ? theme.space[5] : 0,
          borderWidth: theme.edge.borderWidth,
          borderColor: theme.color.edge,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.accent,
          opacity: disabled ? 0.5 : 1,
        },
        fixed,
        style,
      ]}
    >
      {icon ?? (
        <Text style={inkText(theme, { size: "xl", weight: theme.weight.bold, color: theme.color.textOnAccent }).style}>
          +
        </Text>
      )}
      {extended ? (
        <Text style={inkText(theme, { size: "md", weight: theme.weight.bold, color: theme.color.textOnAccent }).style}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/* ── Speed dial ────────────────────────────────────────────────────────── */

export function InkSpeedDial({
  label,
  actions,
  icon,
  position = "bottom-end",
  style,
}: {
  label: string;
  actions: { key: string; label: string; icon?: ReactNode; onPress?: () => void }[];
  icon?: ReactNode;
  position?: "bottom-end" | "bottom-start" | "static";
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const [open, setOpen] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!theme.animate) {
      spin.setValue(open ? 1 : 0);
      return;
    }
    Animated.timing(spin, {
      toValue: open ? 1 : 0,
      duration: theme.duration.base,
      easing: Easing.bezier(...theme.easing),
      useNativeDriver: true,
    }).start();
  }, [open, spin, theme.animate, theme.duration.base, theme.easing]);

  const fixed: ViewStyle =
    position === "static"
      ? {}
      : { position: "absolute", bottom: theme.space[6], [position === "bottom-end" ? "right" : "left"]: theme.space[6] };

  return (
    <View style={[{ alignItems: "flex-end", gap: theme.space[3] }, fixed, style]}>
      {open ? (
        <View accessibilityRole="menu" accessibilityLabel={label} style={{ alignItems: "flex-end", gap: theme.space[2] }}>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="menuitem"
              accessibilityLabel={action.label}
              onPress={() => {
                action.onPress?.();
                setOpen(false);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: theme.space[3] }}
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
                {action.icon}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Animated.View
        style={{
          transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] }) }],
        }}
      >
        <InkFab label={label} icon={icon} position="static" onPress={() => setOpen((o) => !o)} />
      </Animated.View>
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
  const bottom = side === "bottom";
  const full = size === "full";

  return (
    <Modal
      visible={open}
      transparent
      animationType={theme.animate ? (bottom ? "slide" : "fade") : "none"}
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityLabel={`Close ${label}`}
        onPress={onClose}
        style={{
          flex: 1,
          flexDirection: bottom ? "column" : "row",
          justifyContent: bottom ? "flex-end" : side === "end" ? "flex-end" : "flex-start",
          backgroundColor: "rgba(23, 22, 22, 0.42)",
        }}
      >
        <Pressable onPress={() => {}}>
          <View
            accessibilityLabel={label}
            style={[
              {
                width: full ? "100%" : bottom ? "100%" : 340,
                height: bottom ? undefined : "100%",
                maxHeight: bottom ? "86%" : undefined,
                gap: theme.space[4],
                padding: theme.space[6],
                borderWidth: full ? 0 : theme.edge.borderWidth,
                borderColor: theme.color.edge,
                backgroundColor: theme.color.surface,
                borderTopLeftRadius: bottom || side === "end" ? theme.radius["2xl"] : 0,
                borderTopRightRadius: bottom || side === "start" ? theme.radius["2xl"] : 0,
                borderBottomLeftRadius: side === "end" ? theme.radius["2xl"] : 0,
                borderBottomRightRadius: side === "start" ? theme.radius["2xl"] : 0,
              },
              style,
            ]}
          >
            {children}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ── Backdrop ──────────────────────────────────────────────────────────────
 * Rare on purpose: it says "you can do nothing until this finishes", which is
 * true far less often than it is used.
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
    <Modal visible={open} transparent animationType={theme.animate ? "fade" : "none"} onRequestClose={onPress}>
      <Pressable
        accessibilityRole="alert"
        accessibilityLabel={label}
        accessibilityState={{ busy: true }}
        onPress={onPress}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(23, 22, 22, 0.55)" }}
      >
        <View style={{ alignItems: "center", gap: theme.space[3] }}>
          {children ?? <InkSpinner label={label} size={28} />}
          <Text style={inkText(theme, { size: "md", weight: theme.weight.semibold, color: "#FFFFFF" }).style}>
            {label}
          </Text>
        </View>
      </Pressable>
    </Modal>
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

  return (
    <View
      accessibilityLabel={`${label}: ${people.map((p) => p.name).join(", ")}`}
      style={[{ flexDirection: "row", alignItems: "center" }, style]}
    >
      {shown.map((person, i) => (
        <View key={person.name} style={{ marginLeft: i === 0 ? 0 : -Math.round(size * 0.3) }}>
          <InkAvatar name={person.name} src={person.src} size={size} />
        </View>
      ))}
      {rest > 0 ? (
        <View
          style={{
            marginLeft: -Math.round(size * 0.3),
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.color.line,
          }}
        >
          <Text
            style={
              inkText(theme, {
                role: "mono",
                weight: theme.weight.bold,
                color: theme.color.textSecondary,
              }).style
            }
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
