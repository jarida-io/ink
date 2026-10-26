/**
 * Waiting, emptiness, identity, and the thing that tells you what just happened.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { toneColors, type InkTone } from "../core/tone.js";
import { renderIconSlot, type InkIconSlot } from "./icon.js";
import { useInkTheme } from "./InkProvider.js";

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ── Spinner ───────────────────────────────────────────────────────────────
 *
 * `label` is required, and that is the whole design of this component. A
 * spinner that cannot say what it is waiting for is a spinner that is lying:
 * it claims progress it has no knowledge of. Making the label mandatory means
 * you cannot ship one without having answered the question.
 *
 * Prefer `InkMeter` wherever a total is known. Prefer `InkSkeleton` wherever
 * the shape of what is coming is known. A spinner is the last resort.
 */

export function InkSpinner({ label, size = 18 }: { label: string; size?: number }) {
  // An empty label is for a spinner inside a control that already says it is
  // busy, which would otherwise be announced twice.
  return (
    <span
      className="ink-spinner"
      {...(label ? { role: "status", "aria-label": label } : { "aria-hidden": true })}
      style={{ width: size, height: size }}
    />
  );
}

/* ── Skeleton ──────────────────────────────────────────────────────────────
 *
 * The shape of the content before the content, so the layout does not jump when
 * the real thing arrives. It is deliberately not animated by default: a wall of
 * shimmering rectangles is more distracting than a wall of still ones, and the
 * shimmer is the part that costs frames on a board sharing itself with a model.
 */

export function InkSkeleton({
  width,
  height = 14,
  radius = "sm",
  shimmer = false,
  className,
}: {
  width?: number | string;
  height?: number;
  radius?: "sm" | "md" | "lg" | "pill";
  shimmer?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx("ink-skeleton", shimmer && "ink-skeleton--shimmer", className)}
      style={{ width: width ?? "100%", height, borderRadius: `var(--radius-${radius})` }}
    />
  );
}

/* ── Empty state ───────────────────────────────────────────────────────────
 *
 * An invitation to act, not a mood. Which is why `action` sits in the API next
 * to the text rather than being left to the caller: an empty screen with
 * nothing to press on it is a dead end wearing an illustration.
 */

export function InkEmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: InkIconSlot;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("ink-empty", className)}>
      {icon ? <span className="ink-empty__icon">{renderIconSlot(icon, 32)}</span> : null}
      <p className="ink-empty__title">{title}</p>
      {children ? <p className="ink-prose">{children}</p> : null}
      {action}
    </div>
  );
}

/* ── Avatar ────────────────────────────────────────────────────────────────
 *
 * Initials when there is no image, on the neutral fill. Never a colour derived
 * from the name — a hue per person asserts a grouping the data does not have,
 * and it is the same defect as colour-coding a list of voices.
 */

export function InkAvatar({
  name,
  src,
  size = 32,
  className,
}: {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      className={cx("ink-avatar", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      // The name is the label; the initials are a rendering of it, so reading
      // them aloud letter by letter would be worse than useless.
      role="img"
      aria-label={name}
    >
      {src ? <img src={src} alt="" /> : <span aria-hidden="true">{initials}</span>}
    </span>
  );
}

/* ── Toast ─────────────────────────────────────────────────────────────────
 *
 * The duration scales with how long the message takes to read rather than being
 * a constant. Four seconds is generous for "Saved" and not nearly enough for a
 * sentence explaining what failed and what to do about it.
 */

export interface InkToastMessage {
  id: string;
  tone?: InkTone;
  text: string;
  action?: { label: string; onPress: () => void };
}

interface ToastApi {
  show: (toast: Omit<InkToastMessage, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Roughly 200 words a minute, floored at 3s and capped at 12s. */
export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.min(12000, Math.max(3000, Math.round((words / 200) * 60_000) + 1500));
}

let counter = 0;

export function InkToaster({
  children,
  offset = 0,
}: {
  children: ReactNode;
  /** Extra clearance above the bottom edge — a tab bar the toasts must not cover. */
  offset?: number;
}) {
  const [queue, setQueue] = useState<InkToastMessage[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const { color } = useInkTheme();

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.current.delete(id);
    setQueue((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<InkToastMessage, "id">) => {
      counter += 1;
      const id = `ink-toast-${counter}`;
      setQueue((current) => [...current, { ...toast, id }]);
      // A danger toast is never auto-dismissed: it is the one kind whose text
      // the reader may need to act on, and taking it away is taking away the
      // instructions.
      if (toast.tone !== "danger") {
        timers.current.set(id, setTimeout(() => dismiss(id), readingTime(toast.text)));
      }
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="ink-toaster"
        role="region"
        aria-label="Notifications"
        style={offset ? ({ "--ink-toast-offset": `${offset}px` } as CSSProperties) : undefined}
      >
        {queue.map((toast) => {
          const tone = toast.tone ?? "neutral";
          const t = toneColors(tone, color);
          return (
            <div
              key={toast.id}
              className="ink-toast"
              role={tone === "danger" ? "alert" : "status"}
              data-tone={tone}
              style={
                {
                  "--ink-tone-fg": t.fg,
                  "--ink-tone-soft": t.soft,
                  "--ink-tone-solid": t.solid,
                } as CSSProperties
              }
            >
              {tone !== "neutral" ? <span className="ink-toast__dot" aria-hidden="true" /> : null}
              <span className="ink-toast__text">{toast.text}</span>
              {toast.action ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onPress();
                    dismiss(toast.id);
                  }}
                  className="ink-toast__action"
                >
                  {toast.action.label}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="ink-toast__close"
                aria-label="Dismiss"
              >
                {renderIconSlot("x", 16)}
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useInkToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    // A no-op rather than a throw: a component that toasts should still render
    // in a test or a storybook that has not wrapped it.
    return { show: () => {}, dismiss: () => {} };
  }
  return api;
}

/* ── Progress ring ─────────────────────────────────────────────────────────
 *
 * A meter for the places a bar does not fit — beside an avatar, inside a
 * button, on a tile. Same contract as `InkMeter`: omit `value` and it does not
 * pretend to know, it paces.
 *
 * Drawn with two SVG circles and `stroke-dasharray` rather than a conic
 * gradient, because a gradient cannot be given a round cap and a progress ring
 * without one reads as a pie chart.
 */

export function InkProgress({
  value,
  label,
  size = 36,
  thickness = 3,
}: {
  /** 0..1. Omit for indeterminate. */
  value?: number;
  label: string;
  size?: number;
  thickness?: number;
}) {
  const indeterminate = value === undefined || Number.isNaN(value);
  const clamped = indeterminate ? 0.25 : Math.min(1, Math.max(0, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <span
      className={cx("ink-progress", indeterminate && "ink-progress--spin")}
      role="progressbar"
      aria-label={label}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped * 100)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="ink-progress__track"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${circumference * clamped} ${circumference}`}
          // Start at twelve o'clock. An arc that begins at three reads as
          // already part-finished.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="ink-progress__arc"
        />
      </svg>
    </span>
  );
}

/* ── Dots ──────────────────────────────────────────────────────────────────
 *
 * The smallest loader. For inline use where a spinner would be too loud — in a
 * button that is submitting, beside a row that is refreshing.
 */

export function InkDots({ label }: { label: string }) {
  return (
    <span className="ink-dots" role="status" aria-label={label}>
      <span /><span /><span />
    </span>
  );
}

/* ── Backdrop ──────────────────────────────────────────────────────────────
 *
 * A scrim over everything, for a blocking wait. Rare on purpose: a backdrop
 * says "you can do nothing until this finishes", which is true far less often
 * than it is used. Prefer a meter on the thing that is loading.
 *
 * It takes a label because a blocking wait with no explanation is the most
 * frustrating state an interface has.
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
  /** Rarely right — only when the wait is genuinely cancellable. */
  onPress?: () => void;
}) {
  return (
    <div
      className="ink-backdrop"
      data-open={open || undefined}
      aria-hidden={!open}
      role={open ? "alertdialog" : undefined}
      aria-label={open ? label : undefined}
      aria-busy={open}
      onClick={onPress}
    >
      {/* On a card, not the scrim: white on the light scrim measured 2.8:1. */}
      <div className="ink-backdrop__body">
        {children ?? <InkSpinner label="" size={28} />}
        <span className="ink-backdrop__label">{label}</span>
      </div>
    </div>
  );
}

/* ── Avatar group ──────────────────────────────────────────────────────────
 *
 * Overlapping avatars with a count for the rest. The overflow is a number, not
 * more faces: past four the faces stop being recognisable and start being
 * texture, and a reader wanting to know *who* needs a list rather than a
 * smaller circle.
 */

export function InkAvatarGroup({
  label,
  people,
  max = 4,
  size = 32,
  className,
}: {
  label: string;
  people: { name: string; src?: string }[];
  max?: number;
  size?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;

  return (
    <span
      className={cx("ink-avatargroup", className)}
      role="group"
      aria-label={`${label}: ${people.map((p) => p.name).join(", ")}`}
      style={{ ["--ink-avatar-size" as string]: `${size}px` }}
    >
      {shown.map((person) => (
        <InkAvatar key={person.name} name={person.name} src={person.src} size={size} />
      ))}
      {rest > 0 ? (
        <span
          className="ink-avatar ink-avatargroup__rest"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
          aria-hidden="true"
        >
          +{rest}
        </span>
      ) : null}
    </span>
  );
}

/* ── Tooltip ───────────────────────────────────────────────────────────────
 *
 * This was deliberately absent, and the reason still stands: a hover-only
 * affordance and a long-press one are not the same component, and a tooltip is
 * the most commonly misused control in any library — it hides information a
 * touch user and a keyboard user may never see.
 *
 * It is here because the alternative was people building a worse one. So it is
 * built with the constraints made explicit rather than papered over:
 *
 * - It opens on **hover and focus**, never hover alone.
 * - It is `aria-describedby`, so the content reaches a screen reader whether or
 *   not the tooltip ever appears.
 * - It never carries anything a reader *needs*. For that, use `InkRow`'s
 *   description or `InkFormField`'s hint, which are always visible.
 */

export function InkTooltip({
  content,
  placement = "top",
  children,
  className,
}: {
  content: string;
  placement?: "top" | "bottom";
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className={cx("ink-tooltip", className)}
      data-placement={placement}
      data-open={open || undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      // Escape closes it without moving focus — the reader wanted the control,
      // not the label.
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <span className="ink-tooltip__anchor" aria-describedby={id}>
        {children}
      </span>
      <span role="tooltip" id={id} className="ink-tooltip__bubble">
        {content}
      </span>
    </span>
  );
}
