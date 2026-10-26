/**
 * Calendar, date, range and time.
 *
 * All four are the same maths — `@jarida/ink/headless/calendar`, which works in
 * civil dates and never touches a `Date`, so nothing here can be off by an hour
 * in a timezone nobody tested.
 *
 * There are four rather than one configurable component because the *questions*
 * are different. "Which day" and "which two days" have different keyboards,
 * different announcements and different ways of being half-answered, and a
 * single component with a `mode` prop is three components sharing a bug.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { renderIconSlot } from "./icon.js";
import {
  addMonths,
  compareDates,
  dayOfWeek,
  formatTime,
  isSameDay,
  monthGrid,
  moveFocus,
  timeOptions,
  weekdayOrder,
  type CivilDate,
  type CivilTime,
  type Weekday,
} from "../headless/calendar.js";

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function describe(date: CivilDate): string {
  return `${DAY_NAMES[dayOfWeek(date)]} ${date.day} ${MONTHS[date.month - 1]} ${date.year}`;
}

export interface InkCalendarProps {
  /** The chosen day, for a single-date calendar. */
  value?: CivilDate | null;
  onChange?: (date: CivilDate) => void;
  /** Both ends, for a range. Endpoints render differently from the middle. */
  range?: { start: CivilDate | null; end: CivilDate | null };
  onRangeChange?: (range: { start: CivilDate | null; end: CivilDate | null }) => void;
  today?: CivilDate | null;
  min?: CivilDate | null;
  max?: CivilDate | null;
  isDisabled?: (date: CivilDate) => boolean;
  /** 1 is Monday. Defaults to Monday, which is most of the world. */
  weekStartsOn?: Weekday;
  /** Names the calendar for a screen reader. */
  label?: string;
  className?: string;
}

/**
 * The grid itself.
 *
 * One tab stop for the whole month, with the arrows moving inside it — a
 * calendar that costs 35 tab stops is a calendar nobody reaches the end of.
 * That is `role="grid"` with a roving `tabIndex`, and it is the reason a date
 * picker is worth having as a component at all.
 */
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
  className,
}: InkCalendarProps) {
  const anchor = value ?? range?.start ?? today ?? { year: 2026, month: 1, day: 1 };
  const [view, setView] = useState<CivilDate>(anchor);
  const [focused, setFocused] = useState<CivilDate>(anchor);
  const grid = useRef<HTMLDivElement>(null);

  const weeks = useMemo(
    () => monthGrid(view.year, view.month, { weekStartsOn, today, selected: value, range, min, max, isDisabled }),
    [view.year, view.month, weekStartsOn, today, value, range, min, max, isDisabled],
  );

  const pick = useCallback(
    (date: CivilDate) => {
      if (onRangeChange) {
        // A range is half-answered until the second press. Pressing again
        // after a complete range starts a new one rather than extending the
        // old — extending is ambiguous about which end moved.
        if (!range?.start || range.end || compareDates(date, range.start) < 0) {
          onRangeChange({ start: date, end: null });
        } else {
          onRangeChange({ start: range.start, end: date });
        }
        return;
      }
      onChange?.(date);
    },
    [onChange, onRangeChange, range],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(focused);
      return;
    }
    const next = moveFocus(focused, event.key);
    if (!next) return;
    event.preventDefault();
    setFocused(next);
    if (next.month !== view.month || next.year !== view.year) setView(next);
    // Focus follows the model, so the browser scrolls the new cell into view.
    requestAnimationFrame(() => {
      grid.current
        ?.querySelector<HTMLButtonElement>(`[data-key="${next.year}-${next.month}-${next.day}"]`)
        ?.focus();
    });
  };

  return (
    <div className={cx("ink-calendar", className)}>
      <div className="ink-calendar__head">
        <button
          type="button"
          className="ink-calendar__page"
          aria-label="Previous month"
          onClick={() => setView(addMonths(view, -1))}
        >
          {renderIconSlot("chevron-left", 20)}
        </button>
        {/* A live region: paging with the arrows has to announce where you are. */}
        <span className="ink-calendar__month" aria-live="polite">
          {MONTHS[view.month - 1]} {view.year}
        </span>
        <button
          type="button"
          className="ink-calendar__page"
          aria-label="Next month"
          onClick={() => setView(addMonths(view, 1))}
        >
          {renderIconSlot("chevron-right", 20)}
        </button>
      </div>

      <div ref={grid} role="grid" aria-label={label} className="ink-calendar__grid" onKeyDown={onKeyDown}>
        <div role="row" className="ink-calendar__row">
          {weekdayOrder(weekStartsOn).map((day) => (
            <span key={day} role="columnheader" className="ink-calendar__weekday" title={DAY_NAMES[day]}>
              {DAY_NAMES[day].slice(0, 2)}
            </span>
          ))}
        </div>

        {weeks.map((week, i) => (
          <div key={i} role="row" className="ink-calendar__row">
            {week.map((cell) => {
              const key = `${cell.date.year}-${cell.date.month}-${cell.date.day}`;
              const isFocus = isSameDay(cell.date, focused);
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  data-key={key}
                  className="ink-calendar__day"
                  data-outside={!cell.inMonth || undefined}
                  data-today={cell.isToday || undefined}
                  data-selected={cell.selected || undefined}
                  data-in-range={cell.inRange || undefined}
                  data-range-start={cell.rangeStart || undefined}
                  data-range-end={cell.rangeEnd || undefined}
                  aria-selected={cell.selected}
                  aria-disabled={cell.disabled || undefined}
                  aria-label={describe(cell.date)}
                  // One tab stop for the whole grid.
                  tabIndex={isFocus ? 0 : -1}
                  disabled={cell.disabled}
                  onFocus={() => setFocused(cell.date)}
                  onClick={() => pick(cell.date)}
                >
                  {cell.date.day}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Date field ────────────────────────────────────────────────────────────
 *
 * A button that opens a calendar, not a text box that hopes for a format. The
 * typed date is the single most reliable way to collect the wrong value:
 * 03/04 is two different days on two sides of an ocean, and no placeholder has
 * ever fixed it.
 */

export interface InkDatePickerProps extends Omit<InkCalendarProps, "className"> {
  label: string;
  value: CivilDate | null;
  onChange: (date: CivilDate) => void;
  placeholder?: string;
  format?: (date: CivilDate) => string;
  disabled?: boolean;
  className?: string;
}

export function InkDatePicker({
  label,
  value,
  onChange,
  placeholder = "Pick a date",
  format = describe,
  disabled,
  className,
  ...calendar
}: InkDatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cx("ink-picker", className)}>
      <button
        type="button"
        className="ink-picker__field"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cx("ink-picker__value", !value && "ink-picker__value--empty")}>
          {value ? format(value) : placeholder}
        </span>
        <span className="ink-picker__mark" aria-hidden="true" />
      </button>

      {open ? (
        <div className="ink-picker__pop" role="dialog" aria-label={label}>
          <InkCalendar
            {...calendar}
            value={value}
            onChange={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ── Range field ───────────────────────────────────────────────────────── */

export function InkDateRangePicker({
  label,
  value,
  onChange,
  placeholder = "Pick dates",
  format = (date: CivilDate) => `${date.day}/${date.month}/${date.year}`,
  disabled,
  className,
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
    <div className={cx("ink-picker", className)}>
      <button
        type="button"
        className="ink-picker__field"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cx("ink-picker__value", !value.start && "ink-picker__value--empty")}>{text}</span>
        <span className="ink-picker__mark" aria-hidden="true" />
      </button>

      {open ? (
        <div className="ink-picker__pop" role="dialog" aria-label={label}>
          <InkCalendar
            {...calendar}
            range={value}
            onRangeChange={(next) => {
              onChange(next);
              // Closes only once both ends are answered.
              if (next.start && next.end) setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ── Time ──────────────────────────────────────────────────────────────────
 *
 * A list at a step, not three spinners. At 15 minutes that is 96 options —
 * short enough to scroll and far quicker to hit than dialling hours and
 * minutes separately.
 */

export interface InkTimePickerProps {
  label: string;
  value: CivilTime | null;
  onChange: (time: CivilTime) => void;
  step?: number;
  hour12?: boolean;
  disabled?: boolean;
  className?: string;
}

export function InkTimePicker({
  label,
  value,
  onChange,
  step = 15,
  hour12 = false,
  disabled,
  className,
}: InkTimePickerProps) {
  const options = useMemo(() => timeOptions(step), [step]);
  const current = value ? formatTime(value, hour12) : "";

  return (
    <span className={cx("ink-select", className)}>
      <select
        aria-label={label}
        value={current}
        disabled={disabled}
        onChange={(e) => {
          const found = options.find((t) => formatTime(t, hour12) === e.target.value);
          if (found) onChange(found);
        }}
      >
        {value ? null : <option value="">Pick a time</option>}
        {options.map((time) => {
          const text = formatTime(time, hour12);
          return (
            <option key={text} value={text}>
              {text}
            </option>
          );
        })}
      </select>
      <span className="ink-select__mark" aria-hidden="true">
        {renderIconSlot("chevron-down", 18)}
      </span>
    </span>
  );
}

export type { CivilDate, CivilTime };
