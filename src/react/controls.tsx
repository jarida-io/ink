/**
 * The controls. Three of the four spend the edge, and the budget counts them.
 */
import { useCallback, useId, useRef, type ReactNode } from "react";
import { useEdgeBudget } from "../shared/budget.js";
import { reachFor } from "../core/reach.js";
import { renderIconSlot, type InkIconSlot } from "./icon.js";
import { TOUCH } from "../tokens/space.js";
import { controlIconSize, type ControlSize } from "../tokens/control.js";
import { InkSpinner } from "./feedback.js";

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ── Button ────────────────────────────────────────────────────────────────
 *
 * `primary` is the control that is actually asking a question, and a screen
 * gets about one. Everything else is `quiet`: a hairline, a surface fill and no
 * plate. `danger` is a primary that happens to be destructive; it is not a
 * separate emphasis level, and using it for anything reversible spends the
 * one alarming colour on something that is not alarming.
 */

export type InkButtonVariant = "primary" | "quiet" | "danger";

export interface InkButtonProps {
  variant?: InkButtonVariant;
  /** `md` is the touch floor. `sm` keeps the floor through invisible reach. */
  size?: ControlSize;
  onPress?: () => void;
  disabled?: boolean;
  /**
   * The press has been answered and the work is under way. The label stays —
   * a button that swaps its words for a spinner has stopped saying what it is
   * doing — and further presses are refused.
   */
  loading?: boolean;
  /** Full width. The hub uses this; the dense view rarely should. */
  block?: boolean;
  icon?: InkIconSlot;
  type?: "button" | "submit";
  className?: string;
  children: ReactNode;
}

export function InkButton({
  variant = "quiet",
  size = "md",
  onPress,
  disabled,
  loading = false,
  block,
  icon,
  type = "button",
  className,
  children,
}: InkButtonProps) {
  useEdgeBudget(variant !== "quiet");
  const iconSize = controlIconSize(size);
  return (
    <button
      type={type}
      className={cx(
        "ink-btn",
        `ink-btn--${variant}`,
        size !== "md" && `ink-btn--${size}`,
        block && "ink-btn--block",
        size === "sm" && "ink-reach",
        className,
      )}
      onClick={onPress}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
    >
      {loading ? <InkSpinner label="" size={iconSize - 2} /> : renderIconSlot(icon, iconSize)}
      {children}
    </button>
  );
}

/* ── Choice ────────────────────────────────────────────────────────────────
 *
 * The most important component here, and the one that carries the rule.
 *
 * State is elevation, not hue. A chosen thing rises on its offset; everything
 * unchosen lies flat with a hairline. There is no selected-colour, no tinted
 * background, no check mark doing the work of the edge — because colour is the
 * page's scarcest material and spending it on "this one" leaves nothing for the
 * control that is asking a question.
 *
 * `meta` is set in mono at label size. That is what stops a grade, a size or a
 * count competing with the name it belongs to: it is data, and it reads as
 * data.
 *
 * The edge budget only counts this when it is selected, which is the whole
 * point — a row of twelve voices spends one edge, not twelve.
 */

export interface InkChoiceProps {
  selected: boolean;
  onSelect?: () => void;
  /** Pill for a filter or a tab; tile for something with a name and a fact. */
  shape?: "pill" | "tile";
  /** The second line. Mono, and only ever a fact the data actually has. */
  meta?: ReactNode;
  disabled?: boolean;
  /** Set by `InkSegmented`. Standalone, a choice is a toggle button. */
  role?: "button" | "radio";
  tabIndex?: number;
  className?: string;
  children: ReactNode;
}

export function InkChoice({
  selected,
  onSelect,
  shape = "tile",
  meta,
  disabled,
  role = "button",
  tabIndex,
  className,
  children,
}: InkChoiceProps) {
  useEdgeBudget(selected);

  // A pill is under the touch floor by design; it gains the difference
  // vertically rather than growing and stealing its neighbour's taps.
  const dense = shape === "pill";
  const needsReach = reachFor(TOUCH.tapDense).vertical > 0;

  return (
    <button
      type="button"
      role={role === "radio" ? "radio" : undefined}
      aria-pressed={role === "button" ? selected : undefined}
      aria-checked={role === "radio" ? selected : undefined}
      tabIndex={tabIndex}
      disabled={disabled}
      onClick={onSelect}
      className={cx(
        "ink-choice",
        `ink-choice--${shape}`,
        dense && needsReach && "ink-reach",
        className,
      )}
    >
      <span className="ink-choice__name">{children}</span>
      {meta ? <span className="ink-choice__meta">{meta}</span> : null}
    </button>
  );
}

/* ── Segmented ─────────────────────────────────────────────────────────────
 *
 * A radio group of choices. Roving tabindex and arrow keys, because a group of
 * eleven voices that costs eleven tab stops is a group nobody reaches the end
 * of with a keyboard.
 *
 * Enumerated settings use this, or a dropdown. They do not use a text box —
 * a field that accepts anything when the system accepts six things is a field
 * that exists to be typed into wrongly.
 */

export interface InkSegmentedOption<T extends string> {
  value: T;
  label: string;
  meta?: ReactNode;
  disabled?: boolean;
}

export interface InkSegmentedProps<T extends string> {
  /** Names the group for a screen reader. Required. */
  label: string;
  value: T;
  options: InkSegmentedOption<T>[];
  onChange: (value: T) => void;
  shape?: "pill" | "tile";
  className?: string;
}

export function InkSegmented<T extends string>({
  label,
  value,
  options,
  onChange,
  shape = "pill",
  className,
}: InkSegmentedProps<T>) {
  const container = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
      if (!keys.includes(event.key)) return;
      const enabled = options.filter((o) => !o.disabled);
      if (enabled.length === 0) return;
      event.preventDefault();

      const at = Math.max(0, enabled.findIndex((o) => o.value === value));
      const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
      let next = at;
      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = enabled.length - 1;
      else next = (at + (forward ? 1 : -1) + enabled.length) % enabled.length;

      onChange(enabled[next].value);
      // Selection follows focus in a radio group, so move focus with it.
      const buttons = container.current?.querySelectorAll<HTMLButtonElement>("[role='radio']");
      const target = options.findIndex((o) => o.value === enabled[next].value);
      buttons?.[target]?.focus();
    },
    [options, value, onChange],
  );

  return (
    <div
      ref={container}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx("ink-segmented", className)}
    >
      {options.map((option) => (
        <InkChoice
          key={option.value}
          role="radio"
          shape={shape}
          selected={option.value === value}
          disabled={option.disabled}
          meta={option.meta}
          tabIndex={option.value === value ? 0 : -1}
          onSelect={() => onChange(option.value)}
        >
          {option.label}
        </InkChoice>
      ))}
    </div>
  );
}

/* ── Switch ────────────────────────────────────────────────────────────────
 *
 * On or off, and nothing in between. A switch that needs a Save button is a
 * checkbox wearing a switch's clothes; if the change is not applied on flip,
 * use something else.
 */

export interface InkSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Names the control. Pass `labelledBy` instead when a row already names it. */
  label?: string;
  labelledBy?: string;
  disabled?: boolean;
  /**
   * Shown beside the switch, and part of what can be pressed — words that do
   * nothing when clicked are words people click twice.
   */
  children?: ReactNode;
  className?: string;
}

export function InkSwitch({
  checked,
  onChange,
  label,
  labelledBy,
  disabled,
  children,
  className,
}: InkSwitchProps) {
  const id = useId();
  const name = label ?? (typeof children === "string" ? children : undefined);
  const control = (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={labelledBy ? undefined : name}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx("ink-switch", !children && className)}
    >
      <span className="ink-switch__knob" />
    </button>
  );
  if (!children) return control;
  // A label element forwards a click on the words to the button it wraps.
  return (
    <label className={cx("ink-labelled", className)} data-disabled={disabled || undefined}>
      {control}
      <span className="ink-labelled__text">{children}</span>
    </label>
  );
}
