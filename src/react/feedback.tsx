/**
 * Waiting, emptiness, identity, and the thing that tells you what just happened.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toneColors, type InkTone } from "../core/tone.js";
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
  return (
    <span
      className="ink-spinner"
      role="status"
      aria-label={label}
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
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("ink-empty", className)}>
      {icon ? <span className="ink-empty__icon">{icon}</span> : null}
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

export function InkToaster({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<InkToastMessage[]>([]);
  const { color } = useInkTheme();

  const dismiss = useCallback((id: string) => {
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
        setTimeout(() => dismiss(id), readingTime(toast.text));
      }
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ink-toaster" role="region" aria-label="Notifications">
        {queue.map((toast) => {
          const t = toneColors(toast.tone ?? "neutral", color);
          return (
            <div
              key={toast.id}
              className="ink-toast"
              role={toast.tone === "danger" ? "alert" : "status"}
              style={{ ["--ink-tone-fg" as string]: t.fg, ["--ink-tone-soft" as string]: t.soft }}
            >
              <span>{toast.text}</span>
              {toast.action ? (
                <button type="button" onClick={toast.action.onPress} className="ink-toast__action">
                  {toast.action.label}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="ink-toast__close"
                aria-label="Dismiss"
              >
                &times;
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
