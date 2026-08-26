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
import { useInkTheme } from "./InkProvider.js";
import { inkText } from "./type.js";

/* ── Spinner ───────────────────────────────────────────────────────────────
 *
 * `label` is required for the same reason as on the web: a spinner that cannot
 * say what it is waiting for is claiming progress it has no knowledge of.
 */

export function InkSpinner({ label, size = 18 }: { label: string; size?: number }) {
  const theme = useInkTheme();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!theme.animate) return;
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 720,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [spin, theme.animate]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={{
        width: size,
        height: size,
        borderWidth: theme.edge.borderWidth,
        borderColor: theme.color.line,
        borderRadius: size / 2,
        // The top edge is the only one in the accent, so the rotation is
        // visible as motion rather than as a ring that appears to sit still.
        borderTopColor: theme.color.accentLine,
        transform: [
          { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
        ],
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
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: width ?? "100%",
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
  icon?: ReactNode;
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
  });
  const body = inkText(theme, { size: "sm", color: theme.color.textSecondary });

  return (
    <View
      style={[
        {
          alignItems: "center",
          gap: theme.space[3],
          paddingVertical: theme.space[10],
          paddingHorizontal: theme.space[6],
        },
        style,
      ]}
    >
      {icon}
      <Text style={[heading.style, { textAlign: "center" }]}>{title}</Text>
      {typeof children === "string" ? (
        <Text style={[body.style, { textAlign: "center", maxWidth: theme.measure.prose }]}>
          {children}
        </Text>
      ) : (
        children
      )}
      {action}
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
  const text = inkText(theme, {
    size: "base",
    weight: theme.weight.bold,
    color: theme.color.textSecondary,
  });

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.color.line,
        overflow: "hidden",
      }}
    >
      {src ? (
        <Image source={{ uri: src }} style={{ width: size, height: size }} />
      ) : (
        <Text style={[text.style, { fontSize: Math.round(size * 0.38) }]}>{initials}</Text>
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

export function InkToaster({ children }: { children: ReactNode }) {
  const theme = useInkTheme();
  const [queue, setQueue] = useState<InkToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setQueue((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<InkToastMessage, "id">) => {
      counter += 1;
      const id = `ink-toast-${counter}`;
      setQueue((current) => [...current, { ...toast, id }]);
      // A danger toast is never auto-dismissed: its text is the instructions.
      if (toast.tone !== "danger") setTimeout(() => dismiss(id), readingTime(toast.text));
    },
    [dismiss],
  );

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
          bottom: theme.space[6],
          gap: theme.space[2],
        }}
      >
        {queue.map((toast) => {
          const colours = toneColors(toast.tone ?? "neutral", theme.color);
          const body = inkText(theme, { size: "base" });
          const action = inkText(theme, {
            size: "base",
            weight: theme.weight.bold,
            color: colours.fg,
          });
          return (
            <View
              key={toast.id}
              accessibilityRole={toast.tone === "danger" ? "alert" : undefined}
              accessibilityLiveRegion={toast.tone === "danger" ? "assertive" : "polite"}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.space[3],
                paddingVertical: theme.space[3],
                paddingHorizontal: theme.space[4],
                borderWidth: theme.edge.borderWidth,
                borderColor: theme.color.edge,
                borderRadius: theme.radius.md,
                backgroundColor: theme.color.surface,
              }}
            >
              <Text style={[body.style, { flex: 1 }]}>{toast.text}</Text>
              {toast.action ? (
                <Pressable accessibilityRole="button" onPress={toast.action.onPress}>
                  <Text style={action.style}>{toast.action.label}</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
                onPress={() => dismiss(toast.id)}
              >
                <Text style={inkText(theme, { color: theme.color.textTertiary }).style}>
                  &times;
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useInkToast(): ToastApi {
  return useContext(ToastContext) ?? { show: () => {}, dismiss: () => {} };
}
