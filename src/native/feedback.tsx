/**
 * Waiting, emptiness, identity and toasts, on native.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, Easing, Image, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { toneColors, type InkTone } from "../core/tone.js";
import { alpha } from "../tokens/contrast.js";
import { SPRING } from "../tokens/motion.js";
import { Glyph } from "./glyph.js";
import { IconPaintProvider, renderIconSlot, useIconPaint, type InkIconSlot } from "./icon.js";
import { useInkInsets, useInkTheme } from "./InkProvider.js";
import { springTo } from "./motion.js";
import { inkText } from "./type.js";

/**
 * One turn, forever, stopped when the component goes. Reduced motion slows it
 * rather than freezing it: a ring standing still reads as broken, not as busy.
 */
function useTurn(period: number, active = true) {
  const theme = useInkTheme();
  const turn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    turn.setValue(0);
    const loop = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: theme.animate ? period : period * 3,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn, period, active, theme.animate]);

  return turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
}

/* ── Spinner ───────────────────────────────────────────────────────────────
 *
 * `label` is required for the same reason as on the web: a spinner that cannot
 * say what it is waiting for is claiming progress it has no knowledge of. An
 * empty label is for a spinner inside a control that already says so — a busy
 * button — and keeps it out of the accessibility tree.
 *
 * Inside a filled control it takes the label's colour, so it shows on purple.
 */

export function InkSpinner({ label, size = 18 }: { label: string; size?: number }) {
  const theme = useInkTheme();
  const inherited = useIconPaint();
  const rotate = useTurn(720);
  const arc = inherited ?? theme.color.accentLine;

  return (
    <Animated.View
      {...(label
        ? {
            accessibilityRole: "progressbar" as const,
            accessibilityLabel: label,
            accessibilityState: { busy: true },
          }
        : { accessible: false, importantForAccessibility: "no-hide-descendants" as const })}
      style={{
        width: size,
        height: size,
        borderWidth: theme.edge.borderWidth,
        borderColor: inherited ? alpha(inherited, 0.28) : theme.color.line,
        borderRadius: size / 2,
        // The top edge is the only one in colour, so the rotation is visible as
        // motion rather than as a ring that appears to sit still.
        borderTopColor: arc,
        transform: [{ rotate }],
      }}
    />
  );
}

/* ── Skeleton ──────────────────────────────────────────────────────────────
 *
 * Still by default. A wall of shimmering rectangles is more distracting than a
 * wall of still ones, and the shimmer is the part that costs frames on a board
 * that is also running a language model.
 */

export function InkSkeleton({
  width,
  height = 14,
  radius = "sm",
  style,
}: {
  width?: number | string;
  height?: number;
  radius?: "sm" | "md" | "lg" | "pill";
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: (width ?? "100%") as ViewStyle["width"],
          height,
          borderRadius: theme.radius[radius],
          backgroundColor: theme.color.line,
        },
        style,
      ]}
    />
  );
}

/* ── Empty state ───────────────────────────────────────────────────────── */

export function InkEmptyState({
  icon,
  title,
  children,
  action,
  style,
}: {
  icon?: InkIconSlot;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const heading = inkText(theme, {
    role: "display",
    size: "lg",
    weight: theme.weight.bold,
    tracking: "snug",
    leading: "snug",
  });
  const body = inkText(theme, { size: "base", color: theme.color.textSecondary });

  return (
    <View
      style={[
        {
          alignItems: "center",
          gap: theme.space[2],
          paddingVertical: theme.space[10],
          paddingHorizontal: theme.space[6],
        },
        style,
      ]}
    >
      {icon ? (
        // Quieter than the words: the icon says what kind of empty, the title
        // says what to do about it.
        <IconPaintProvider value={theme.color.textTertiary}>
          <View style={{ marginBottom: theme.space[2] }}>{renderIconSlot(icon, 32)}</View>
        </IconPaintProvider>
      ) : null}
      <Text accessibilityRole="header" style={[heading.style, { textAlign: "center" }]}>
        {title}
      </Text>
      {typeof children === "string" ? (
        <Text style={[body.style, { textAlign: "center", maxWidth: theme.measure.lead }]}>{children}</Text>
      ) : (
        children
      )}
      {action ? <View style={{ marginTop: theme.space[3] }}>{action}</View> : null}
    </View>
  );
}

/* ── Avatar ────────────────────────────────────────────────────────────────
 *
 * Never a colour derived from the name. A hue per person asserts a grouping the
 * data does not have — the same defect as colour-coding a list of voices.
 */

export function InkAvatar({
  name,
  src,
  size = 32,
}: {
  name: string;
  src?: string;
  size?: number;
}) {
  const theme = useInkTheme();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const fontSize = Math.round(size * 0.38);
  const text = inkText(theme, {
    size: "base",
    weight: theme.weight.bold,
    color: theme.color.textSecondary,
  });

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.color.neutralSoft,
        borderWidth: theme.edge.hairlineWidth,
        borderColor: theme.color.line,
        overflow: "hidden",
      }}
    >
      {src ? (
        <Image source={{ uri: src }} style={{ width: size, height: size }} />
      ) : (
        // The line height follows the size, or a large avatar's initials are
        // clipped by the 13px body leading they inherited.
        <Text style={[text.style, { fontSize, lineHeight: Math.round(fontSize * 1.2) }]}>{initials}</Text>
      )}
    </View>
  );
}

/* ── Toast ─────────────────────────────────────────────────────────────────
 *
 * The duration scales with how long the message takes to read. Four seconds is
 * generous for "Saved" and nowhere near enough for a sentence explaining what
 * failed and what to do about it.
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

type Queued = InkToastMessage & { leaving?: boolean };

export function InkToaster({
  children,
  offset = 0,
}: {
  children: ReactNode;
  /** Extra clearance above the bottom inset — a tab bar the toasts must not cover. */
  offset?: number;
}) {
  const theme = useInkTheme();
  const insets = useInkInsets();
  const [queue, setQueue] = useState<Queued[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.current.delete(id);
    setQueue((current) => current.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
  }, []);

  const forget = useCallback((id: string) => {
    setQueue((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<InkToastMessage, "id">) => {
      counter += 1;
      const id = `ink-toast-${counter}`;
      setQueue((current) => [...current, { ...toast, id }]);
      // A danger toast is never auto-dismissed: its text is the instructions.
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
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: theme.space[4],
          right: theme.space[4],
          bottom: insets.bottom + theme.space[4] + offset,
          gap: theme.space[2],
        }}
      >
        {queue.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} onGone={forget} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function Toast({
  toast,
  onDismiss,
  onGone,
}: {
  toast: Queued;
  onDismiss: (id: string) => void;
  onGone: (id: string) => void;
}) {
  const theme = useInkTheme();
  const shown = useRef(new Animated.Value(0)).current;
  const [pressed, setPressed] = useState<"action" | "close" | null>(null);
  const tone = toast.tone ?? "neutral";
  const colours = toneColors(tone, theme.color);

  useEffect(() => {
    const animation = theme.animate
      ? springTo(shown, toast.leaving ? 0 : 1, {
          spring: toast.leaving ? SPRING.snappy : SPRING.default,
          rest: 0.001,
        })
      : Animated.timing(shown, {
          toValue: toast.leaving ? 0 : 1,
          duration: theme.duration.fast,
          useNativeDriver: true,
        });
    animation.start(({ finished }) => {
      if (finished && toast.leaving) onGone(toast.id);
    });
    return () => animation.stop();
  }, [toast.leaving, toast.id, shown, onGone, theme.animate, theme.duration.fast]);

  return (
    <Animated.View
      accessibilityRole={tone === "danger" ? "alert" : undefined}
      accessibilityLiveRegion={tone === "danger" ? "assertive" : "polite"}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.space[3],
        minHeight: theme.touch.tapMin + theme.space[2],
        paddingLeft: theme.space[4],
        paddingRight: theme.space[1],
        borderWidth: theme.edge.borderWidth,
        borderColor: theme.color.edge,
        borderRadius: theme.radius.md,
        backgroundColor: theme.color.surface,
        opacity: shown,
        transform: theme.animate
          ? [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }]
          : [],
      }}
    >
      {tone !== "neutral" ? (
        <View
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colours.solid }}
          accessible={false}
        />
      ) : null}
      <Text style={[inkText(theme, { size: "base", leading: "snug" }).style, { flex: 1, paddingVertical: theme.space[3] }]}>
        {toast.text}
      </Text>
      {toast.action ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            toast.action?.onPress();
            onDismiss(toast.id);
          }}
          onPressIn={() => setPressed("action")}
          onPressOut={() => setPressed(null)}
          style={{
            minHeight: theme.touch.tapMin,
            justifyContent: "center",
            paddingHorizontal: theme.space[3],
            borderRadius: theme.radius.sm,
            backgroundColor: pressed === "action" ? theme.color.pressed : undefined,
          }}
        >
          <Text
            style={
              inkText(theme, {
                size: "base",
                weight: theme.weight.bold,
                color: tone === "neutral" ? theme.color.accentLine : colours.fg,
              }).style
            }
          >
            {toast.action.label}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={() => onDismiss(toast.id)}
        onPressIn={() => setPressed("close")}
        onPressOut={() => setPressed(null)}
        style={{
          width: theme.touch.tapMin,
          height: theme.touch.tapMin,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: theme.radius.sm,
          backgroundColor: pressed === "close" ? theme.color.pressed : undefined,
        }}
      >
        <Glyph name="x" size={16} paint={theme.color.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

export function useInkToast(): ToastApi {
  return useContext(ToastContext) ?? { show: () => {}, dismiss: () => {} };
}

/* ── Progress ring ─────────────────────────────────────────────────────────
 *
 * Two clipped halves, each holding a rotated bordered circle.
 *
 * The obvious implementation is an SVG arc, and `react-native-svg` is the
 * obvious dependency — which this library does not take on a consumer's behalf
 * for a single component. The half-and-half technique is older, uglier and
 * needs nothing: below 50% only the right half's circle rotates; past it the
 * right half is fully shown and the left one takes over.
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
  const theme = useInkTheme();
  const indeterminate = value === undefined || Number.isNaN(value);
  const rotate = useTurn(900, indeterminate);
  const clamped = indeterminate ? 0.25 : Math.min(1, Math.max(0, value));

  const half = size / 2;
  // Each half is drawn from a ring whose two adjacent sides are coloured, so a
  // rotated half reveals exactly its share of the arc and nothing of the rest.
  const arc = (rotation: number): ViewStyle => ({
    position: "absolute",
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: thickness,
    borderColor: "transparent",
    borderTopColor: theme.color.accentLine,
    borderRightColor: theme.color.accentLine,
    transform: [{ rotate: `${rotation}deg` }],
  });

  // Right half: -135deg shows nothing, 45deg shows the whole half.
  const right = -135 + Math.min(clamped, 0.5) * 360;
  const left = -135 + Math.max(0, clamped - 0.5) * 360;

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={indeterminate ? { busy: true } : undefined}
      accessibilityValue={indeterminate ? undefined : { min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ width: size, height: size, transform: indeterminate ? [{ rotate }] : [] }}
    >
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: thickness,
          borderColor: theme.color.line,
        }}
      />
      <View style={{ position: "absolute", left: half, width: half, height: size, overflow: "hidden" }}>
        <View style={{ position: "absolute", left: -half, width: size, height: size }}>
          <View style={arc(right)} />
        </View>
      </View>
      {clamped > 0.5 ? (
        <View style={{ position: "absolute", left: 0, width: half, height: size, overflow: "hidden" }}>
          <View style={{ position: "absolute", left: 0, width: size, height: size, transform: [{ rotate: "180deg" }] }}>
            <View style={arc(left)} />
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

/* ── Dots ──────────────────────────────────────────────────────────────────
 *
 * The smallest loader, for inline use where a spinner would be too loud. A
 * wave runs through the three, because three still dots are an ellipsis.
 */

export function InkDots({ label }: { label: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }}>
      <WaveDots size={5} gap={3} />
    </View>
  );
}

/** The three-dot wave, shared with the typing indicator. */
export function WaveDots({ size, gap, colour }: { size: number; gap: number; colour?: string }) {
  const theme = useInkTheme();
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!theme.animate) return;
    const loop = Animated.loop(
      Animated.timing(wave, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [wave, theme.animate]);

  const dot = (i: number) => {
    const start = i * 0.2;
    return {
      width: size,
      height: size,
      borderRadius: theme.radius.pill,
      backgroundColor: colour ?? theme.color.textSecondary,
      opacity: theme.animate
        ? wave.interpolate({
            inputRange: [0, start, start + 0.2, start + 0.4, 1],
            outputRange: [0.35, 0.35, 1, 0.35, 0.35],
          })
        : 1 - i * 0.3,
    };
  };

  return (
    <View style={{ flexDirection: "row", gap, alignItems: "center" }}>
      <Animated.View style={dot(0)} />
      <Animated.View style={dot(1)} />
      <Animated.View style={dot(2)} />
    </View>
  );
}
