/**
 * The form controls.
 *
 * The house rule they all obey: **enumerated things are not typed.** If the
 * system accepts six values, the control offers six values — a text box that
 * accepts anything when the system accepts six exists to be typed into wrongly.
 * `InkInput` is for names, phrases and search; `InkSegmented` or `InkSelect` is
 * for everything with a list behind it.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { isRovingKey, rove } from "../headless/roving.js";

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ── Input ─────────────────────────────────────────────────────────────────
 *
 * `invalid` takes a message rather than a boolean. A field that turns red
 * without saying why has told the reader they are wrong and withheld the one
 * thing that would let them fix it.
 */

export interface InkInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  /** The message shown, and announced, when the value will not do. */
  invalid?: string;
  disabled?: boolean;
  type?: "text" | "search" | "email" | "url" | "number";
  lead?: ReactNode;
  trail?: ReactNode;
  className?: string;
}

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
  className,
}: InkInputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={cx("ink-input", invalid && "ink-input--invalid", className)}>
      <div className="ink-input__box">
        {lead ? <span className="ink-input__lead">{lead}</span> : null}
        <input
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {trail ? <span className="ink-input__trail">{trail}</span> : null}
      </div>
      {invalid ? (
        <p id={errorId} className="ink-input__error" role="alert">
          {invalid}
        </p>
      ) : null}
    </div>
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
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  maxRows?: number;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function grow(node: HTMLTextAreaElement) {
    node.style.height = "auto";
    const line = parseFloat(getComputedStyle(node).lineHeight) || 20;
    node.style.height = `${Math.min(node.scrollHeight, line * maxRows)}px`;
  }

  return (
    <textarea
      ref={ref}
      className={cx("ink-textarea", className)}
      value={value}
      rows={rows}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => {
        onChange(e.target.value);
        grow(e.target);
      }}
    />
  );
}

/* ── Select ────────────────────────────────────────────────────────────────
 *
 * The platform's own picker, wearing the house material.
 *
 * Not a custom listbox, and that is a decision. A hand-built dropdown has to
 * reimplement keyboard navigation, typeahead, scroll containment, screen-reader
 * semantics and mobile presentation, and it will be worse at all five than the
 * one the operating system ships. Reach for `InkSegmented` when there are few
 * enough options to show at once, and this when there are not.
 */

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
  className,
}: {
  label: string;
  value: T;
  options: InkSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <span className={cx("ink-select", className)}>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}

/* ── Checkbox ──────────────────────────────────────────────────────────────
 *
 * Distinct from `InkSwitch` by when it takes effect, not by how it looks: a
 * switch applies on flip, a checkbox is part of a form that is submitted. It
 * also has a third state a switch cannot have — indeterminate, for a parent
 * whose children disagree.
 */

export function InkCheckbox({
  checked,
  onChange,
  label,
  indeterminate = false,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  indeterminate?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx("ink-checkbox", className)}
      data-state={indeterminate ? "mixed" : checked ? "on" : "off"}
    >
      <span className="ink-checkbox__mark" aria-hidden="true" />
    </button>
  );
}

/* ── Slider ────────────────────────────────────────────────────────────────
 *
 * A range input wearing the ink thumb: a 20px circle with the 2px border and a
 * short offset, on a track that is a hairline-bordered pill.
 *
 * `format` exists because a slider without a readout is a control that cannot
 * be reported. The value has to be legible without dragging.
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
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  format?: (value: number) => string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      type="range"
      className={cx("ink-slider", className)}
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={label}
      aria-valuetext={format ? format(value) : undefined}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

/* ── Radio group ───────────────────────────────────────────────────────────
 *
 * Distinct from `InkSegmented`, and the difference is not visual.
 *
 * A segmented control is for values that fit on one line and read as a scale or
 * a small closed set — three qualities, two accents. A radio group is for
 * choices that need **explaining**: each option carries a description, they
 * stack, and the reader is expected to weigh them rather than flick between
 * them.
 *
 * If you find yourself wanting a description on a segment, you wanted this.
 */

export interface InkRadioOption<T extends string> {
  value: T;
  label: string;
  /** The reason to pick this one. What makes a radio group worth the height. */
  description?: ReactNode;
  disabled?: boolean;
}

export function InkRadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: InkRadioOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const group = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label={label}
      className={cx("ink-radios", className)}
      onKeyDown={(event) => {
        if (!isRovingKey(event.key, "vertical")) return;
        const at = options.findIndex((o) => o.value === value);
        const next = rove(event.key, at, options.length, {
          disabled: options.map((o) => !!o.disabled),
          orientation: "vertical",
        });
        if (next === null) return;
        event.preventDefault();
        onChange(options[next].value);
        group.current?.querySelectorAll<HTMLButtonElement>("[role='radio']")[next]?.focus();
      }}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className="ink-radio"
          >
            <span className="ink-radio__dot" aria-hidden="true" />
            <span className="ink-radio__text">
              <span className="ink-radio__label">{option.label}</span>
              {option.description ? (
                <span className="ink-radio__desc">{option.description}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Menu ──────────────────────────────────────────────────────────────────
 *
 * The dropdown. Deliberately *not* built on a positioning engine: it is
 * anchored to its trigger with plain absolute positioning and flips upward when
 * there is no room below.
 *
 * A full engine buys collision handling against arbitrary scroll containers,
 * and costs a dependency, a resize observer per menu and a class of bug where
 * the menu detaches from a control that moved. For a menu of a handful of
 * actions attached to a button, the trade is not worth it.
 *
 * Use it for **actions**. For picking a value, `InkSelect` uses the platform's
 * own picker and is better at every part of it.
 */

export interface InkMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Draws a rule above this item. For separating the destructive one. */
  separated?: boolean;
  tone?: "neutral" | "danger";
}

export function InkMenu({
  label,
  trigger,
  items,
  align = "start",
  className,
}: {
  label: string;
  /** The control that opens it. Gets the aria wiring automatically. */
  trigger: (props: { onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu" }) => ReactNode;
  items: InkMenuItem[];
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) return;
    // Flip upward when the menu would not fit. One measurement at open time,
    // rather than an observer that runs for the life of the page.
    const node = list.current;
    if (node) {
      const box = node.getBoundingClientRect();
      setFlip(box.bottom > window.innerHeight && box.top > box.height);
    }
    const onAway = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const enabled = items.map((i) => !!i.disabled);

  return (
    <div ref={root} className={cx("ink-menu", className)}>
      {trigger({
        onClick: () => setOpen((o) => !o),
        "aria-expanded": open,
        "aria-haspopup": "menu",
      })}

      {open ? (
        <div
          ref={list}
          role="menu"
          aria-label={label}
          className="ink-menu__list"
          data-align={align}
          data-flip={flip || undefined}
          onKeyDown={(event) => {
            if (!isRovingKey(event.key, "vertical")) return;
            const next = rove(event.key, active, items.length, {
              disabled: enabled,
              orientation: "vertical",
            });
            if (next === null) return;
            event.preventDefault();
            setActive(next);
            list.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']")[next]?.focus();
          }}
        >
          {items.map((item, i) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className="ink-menu__item"
              data-tone={item.tone}
              data-separated={item.separated || undefined}
              tabIndex={i === active ? 0 : -1}
              disabled={item.disabled}
              onClick={() => {
                item.onPress?.();
                setOpen(false);
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ── Range slider ──────────────────────────────────────────────────────────
 *
 * Two thumbs on one track, as two overlaid inputs rather than a custom widget.
 * That keeps the whole keyboard and screen-reader behaviour the platform
 * already ships, which no hand-rolled two-thumb slider has ever matched.
 *
 * The ends cannot cross. They clamp against each other rather than swapping,
 * because a handle that becomes the other handle mid-drag is disorienting and
 * makes the value you were watching jump.
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
  className,
}: {
  label: string;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
  disabled?: boolean;
  className?: string;
}) {
  const [low, high] = value;
  const span = max - min || 1;
  const fillLeft = ((low - min) / span) * 100;
  const fillRight = ((high - min) / span) * 100;

  return (
    <div className={cx("ink-range", className)} data-disabled={disabled || undefined}>
      <div className="ink-range__track" aria-hidden="true">
        <span
          className="ink-range__fill"
          style={{ left: `${fillLeft}%`, right: `${100 - fillRight}%` }}
        />
      </div>
      <input
        type="range"
        className="ink-range__input"
        aria-label={`${label}, lower bound`}
        aria-valuetext={format ? format(low) : undefined}
        min={min}
        max={max}
        step={step}
        value={low}
        disabled={disabled}
        onChange={(e) => onChange([Math.min(Number(e.target.value), high), high])}
      />
      <input
        type="range"
        className="ink-range__input"
        aria-label={`${label}, upper bound`}
        aria-valuetext={format ? format(high) : undefined}
        min={min}
        max={max}
        step={step}
        value={high}
        disabled={disabled}
        onChange={(e) => onChange([low, Math.max(Number(e.target.value), low)])}
      />
    </div>
  );
}

/* ── Form ──────────────────────────────────────────────────────────────────
 *
 * A layout and an error summary, not a validation library. Validation belongs
 * to the application; what a design system owes it is somewhere consistent to
 * put the answer.
 *
 * The summary is the part worth having. A form that fails silently at the
 * bottom, or scatters errors beside fields that are off-screen, is a form
 * people abandon — so `InkForm` collects them, announces the count, and links
 * each one to its field.
 */

export interface InkFormError {
  field: string;
  message: string;
}

export function InkForm({
  label,
  errors = [],
  onSubmit,
  actions,
  children,
  className,
}: {
  label: string;
  errors?: InkFormError[];
  onSubmit?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const summary = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Move focus to the summary when a submit fails. Without it the reader
    // presses Save, nothing appears to happen, and the reason is above them.
    if (errors.length > 0) summary.current?.focus();
  }, [errors.length]);

  return (
    <form
      aria-label={label}
      className={cx("ink-form", className)}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      {errors.length > 0 ? (
        <div
          ref={summary}
          tabIndex={-1}
          role="alert"
          className="ink-form__summary"
        >
          <strong>
            {errors.length === 1 ? "One thing needs fixing" : `${errors.length} things need fixing`}
          </strong>
          <ul>
            {errors.map((error) => (
              <li key={error.field}>
                <a href={`#${error.field}`}>{error.message}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="ink-form__body">{children}</div>
      {actions ? <div className="ink-form__actions">{actions}</div> : null}
    </form>
  );
}

export function InkFormField({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Marked in words, not with an asterisk nobody has explained. */
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("ink-formfield", className)} id={id}>
      <label className="ink-formfield__label" htmlFor={`${id}-control`}>
        {label}
        {required ? <span className="ink-formfield__required"> (required)</span> : null}
      </label>
      {hint ? <span className="ink-formfield__hint">{hint}</span> : null}
      {children}
      {error ? (
        <span className="ink-formfield__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
