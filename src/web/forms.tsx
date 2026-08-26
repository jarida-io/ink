/**
 * The form controls.
 *
 * The house rule they all obey: **enumerated things are not typed.** If the
 * system accepts six values, the control offers six values — a text box that
 * accepts anything when the system accepts six exists to be typed into wrongly.
 * `InkInput` is for names, phrases and search; `InkSegmented` or `InkSelect` is
 * for everything with a list behind it.
 */
import { useId, useRef, type ReactNode } from "react";

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
