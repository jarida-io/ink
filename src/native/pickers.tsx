/**
 * Calendar, date, range and time, on native.
 *
 * Same maths as the web — `@jarida/ink/headless/calendar`, which works in civil
 * dates and never touches a `Date`, so a grid rendered here and a grid rendered
 * in a browser agree about which day a month starts on.
 *
 * The presentation differs and should: a popover anchored to a field is a
 * pointer idiom. Here the picker opens a sheet, which is what a touch platform
 * does with a decision that needs the whole screen.
 */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import {
  addMonths,
  compareDates,
  dayOfWeek,
  formatTime,
  monthGrid,
  timeOptions,
  weekdayOrder,
  type CivilDate,
  type CivilTime,
  type Weekday,
} from "../headless/calendar.js";
import { DISABLED_OPACITY } from "../tokens/control.js";
import { fieldFrame } from "./field.js";
import { Glyph } from "./glyph.js";
import { useInkTheme } from "./InkProvider.js";
import { InkSheet } from "./overlays.js";
import { inkText } from "./type.js";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function describe(date: CivilDate): string {
  return `${DAY_NAMES[dayOfWeek(date)]} ${date.day} ${MONTHS[date.month - 1]} ${date.year}`;
}

export interface InkCalendarProps {
  value?: CivilDate | null;
  onChange?: (date: CivilDate) => void;
  range?: { start: CivilDate | null; end: CivilDate | null };
  onRangeChange?: (range: { start: CivilDate | null; end: CivilDate | null }) => void;
  today?: CivilDate | null;
  min?: CivilDate | null;
  max?: CivilDate | null;
  isDisabled?: (date: CivilDate) => boolean;
  weekStartsOn?: Weekday;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function InkCalendar({
  value = null,
  onChange,
  range,
  onRangeChange,
  today = null,
  min = null,
  max = null,
  isDisabled,
  weekStartsOn = 1,
  label = "Calendar",
  style,
}: InkCalendarProps) {
  const theme = useInkTheme();
  const anchor = value ?? range?.start ?? today ?? { year: 2026, month: 1, day: 1 };
  const [view, setView] = useState<CivilDate>(anchor);

  const weeks = useMemo(
    () => monthGrid(view.year, view.month, { weekStartsOn, today, selected: value, range, min, max, isDisabled }),
    [view.year, view.month, weekStartsOn, today, value, range, min, max, isDisabled],
  );

  function pick(date: CivilDate) {
    if (onRangeChange) {
      // Half-answered until the second press; pressing again after a complete
      // range starts a new one rather than extending an ambiguous end.
      if (!range?.start || range.end || compareDates(date, range.start) < 0) {
        onRangeChange({ start: date, end: null });
      } else {
        onRangeChange({ start: range.start, end: date });
      }
      return;
    }
    onChange?.(date);
  }

  const cell = theme.touch.tapMin;
  const heading = inkText(theme, { role: "display", size: "md", weight: theme.weight.bold, tracking: "snug" });
  const weekday = inkText(theme, {
    role: "mono", size: "xs", weight: theme.weight.bold,
    tracking: "wide", uppercase: true, color: theme.color.textTertiary,
  });

  return (
    <View accessibilityLabel={label} style={[{ gap: theme.space[2] }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => setView(addMonths(view, -1))}
          style={({ pressed }) => ({
            width: cell,
            height: cell,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: theme.radius.md,
            backgroundColor: pressed ? theme.color.pressed : undefined,
          })}
        >
          <Glyph name="chevron-left" size={20} paint={theme.color.text} />
        </Pressable>
        {/* Paging has to announce where it landed. */}
        <Text accessibilityLiveRegion="polite" style={heading.style}>
          {MONTHS[view.month - 1]} {view.year}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => setView(addMonths(view, 1))}
          style={({ pressed }) => ({
            width: cell,
            height: cell,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: theme.radius.md,
            backgroundColor: pressed ? theme.color.pressed : undefined,
          })}
        >
          <Glyph name="chevron-right" size={20} paint={theme.color.text} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row" }}>
        {weekdayOrder(weekStartsOn).map((day) => (
          <View key={day} style={{ flex: 1, alignItems: "center", paddingVertical: theme.space[1] }}>
            <Text style={weekday.style}>{DAY_NAMES[day].slice(0, 2)}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, i) => (
        <View key={i} style={{ flexDirection: "row" }}>
          {week.map((c) => {
            const key = `${c.date.year}-${c.date.month}-${c.date.day}`;
            const colour = c.selected
              ? theme.color.textOnAccent
              : c.inMonth
                ? theme.color.text
                : theme.color.textTertiary;
            const text = inkText(theme, {
              size: "base",
              weight: c.selected ? theme.weight.bold : theme.weight.medium,
              color: colour,
            });
            // A range is a band behind the days, so it reads as one span; the
            // ends are discs on it, like any other chosen day.
            const banded = (c.inRange || c.rangeStart || c.rangeEnd) && !(c.rangeStart && c.rangeEnd);
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={describe(c.date)}
                accessibilityState={{ selected: c.selected, disabled: c.disabled }}
                disabled={c.disabled}
                onPress={() => pick(c.date)}
                style={{
                  flex: 1,
                  height: cell,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: c.disabled ? DISABLED_OPACITY : 1,
                }}
              >
                {({ pressed }) => (
                  <>
                    {banded ? (
                      <View
                        style={{
                          position: "absolute",
                          top: 2,
                          bottom: 2,
                          left: c.rangeStart ? "50%" : 0,
                          right: c.rangeEnd ? "50%" : 0,
                          backgroundColor: theme.color.accentSoft,
                        }}
                      />
                    ) : null}
                    <View
                      style={{
                        width: cell - 4,
                        height: cell - 4,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: theme.radius.md,
                        backgroundColor: c.selected
                          ? theme.color.accent
                          : pressed
                            ? theme.color.pressed
                            : "transparent",
                        // Today is a ring, not a fill: a fill would be
                        // indistinguishable from the selection.
                        borderWidth: c.isToday && !c.selected ? theme.edge.borderWidth : 0,
                        borderColor: theme.color.accentLine,
                      }}
                    >
                      <Text style={[text.style, { fontVariant: ["tabular-nums"] }]}>{c.date.day}</Text>
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/* ── Date field ────────────────────────────────────────────────────────── */

export interface InkDatePickerProps extends Omit<InkCalendarProps, "style"> {
  label: string;
  value: CivilDate | null;
  onChange: (date: CivilDate) => void;
  placeholder?: string;
  format?: (date: CivilDate) => string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

function Field({
  label,
  text,
  empty,
  open,
  disabled,
  onPress,
  style,
}: {
  label: string;
  text: string;
  empty: boolean;
  open: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const value = inkText(theme, {
    size: "md",
    weight: empty ? theme.weight.regular : theme.weight.semibold,
    color: empty ? theme.color.textTertiary : theme.color.text,
  });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text: empty ? undefined : text }}
      accessibilityState={{ disabled, expanded: open }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
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
      <Text numberOfLines={1} style={[value.style, { flexShrink: 1 }]}>
        {text}
      </Text>
      <Glyph name="chevron-down" size={18} paint={theme.color.textSecondary} />
    </Pressable>
  );
}

export function InkDatePicker({
  label,
  value,
  onChange,
  placeholder = "Pick a date",
  format = describe,
  disabled,
  style,
  ...calendar
}: InkDatePickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Field
        label={label}
        text={value ? format(value) : placeholder}
        empty={!value}
        open={open}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={style}
      />
      <InkSheet open={open} onClose={() => setOpen(false)} title={label}>
        <InkCalendar
          {...calendar}
          value={value}
          onChange={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
      </InkSheet>
    </>
  );
}

export function InkDateRangePicker({
  label,
  value,
  onChange,
  placeholder = "Pick dates",
  format = (date: CivilDate) => `${date.day}/${date.month}/${date.year}`,
  disabled,
  style,
  ...calendar
}: Omit<InkDatePickerProps, "value" | "onChange"> & {
  value: { start: CivilDate | null; end: CivilDate | null };
  onChange: (range: { start: CivilDate | null; end: CivilDate | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const text = value.start
    ? `${format(value.start)} – ${value.end ? format(value.end) : "…"}`
    : placeholder;
  return (
    <>
      <Field
        label={label}
        text={text}
        empty={!value.start}
        open={open}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={style}
      />
      <InkSheet open={open} onClose={() => setOpen(false)} title={label}>
        <InkCalendar
          {...calendar}
          range={value}
          onRangeChange={(next) => {
            onChange(next);
            if (next.start && next.end) setOpen(false);
          }}
        />
      </InkSheet>
    </>
  );
}

/* ── Time ──────────────────────────────────────────────────────────────── */

export interface InkTimePickerProps {
  label: string;
  value: CivilTime | null;
  onChange: (time: CivilTime) => void;
  step?: number;
  hour12?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function InkTimePicker({
  label,
  value,
  onChange,
  step = 15,
  hour12 = false,
  disabled,
  style,
}: InkTimePickerProps) {
  const theme = useInkTheme();
  const [open, setOpen] = useState(false);
  const options = useMemo(() => timeOptions(step), [step]);
  const selectedIndex = value
    ? Math.max(0, options.findIndex((t) => t.hour === value.hour && t.minute === value.minute))
    : 0;

  return (
    <>
      <Field
        label={label}
        text={value ? formatTime(value, hour12) : "Pick a time"}
        empty={!value}
        open={open}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={style}
      />
      <InkSheet open={open} onClose={() => setOpen(false)} title={label} scroll={false}>
        <ScrollView
          style={{ maxHeight: 360, flexShrink: 1 }}
          // Opens on the current time, a few rows down, rather than on midnight.
          contentOffset={{ x: 0, y: Math.max(0, selectedIndex - 3) * theme.touch.tapMin }}
        >
          {options.map((time) => {
            const text = formatTime(time, hour12);
            const on = !!value && value.hour === time.hour && value.minute === time.minute;
            return (
              <Pressable
                key={text}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  onChange(time);
                  setOpen(false);
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: theme.touch.tapMin,
                  paddingHorizontal: theme.space[3],
                  borderRadius: theme.radius.md,
                  backgroundColor: on ? theme.color.accentSoft : pressed ? theme.color.pressed : "transparent",
                })}
              >
                <Text
                  style={
                    inkText(theme, {
                      role: "mono",
                      size: "md",
                      weight: on ? theme.weight.bold : theme.weight.regular,
                    }).style
                  }
                >
                  {text}
                </Text>
                {on ? <Glyph name="check" size={18} paint={theme.color.accentLine} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </InkSheet>
    </>
  );
}

export type { CivilDate, CivilTime };
