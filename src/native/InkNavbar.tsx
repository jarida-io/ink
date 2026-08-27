/**
 * The bar, on native. Same three stages, same headless behaviour.
 *
 * Two differences from the web binding, both the platform rather than a choice:
 *
 * - **The stage comes from the app.** React Native has no scroll listener on a
 *   window, so pass `onScroll`'s offset to a `NavbarBehaviour` and hand the
 *   result down, or leave it and the bar stays whole.
 * - **Nothing blurs what is behind a view.** There is no `backdrop-filter` and
 *   no way to add one; `blurComponent` is a slot for `expo-blur` if the app has
 *   it. Without it the bar renders the derived tint alone, which is exactly as
 *   readable — the tint was never the decoration.
 */
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { stageHasMaterial, type NavbarStage } from "../headless/navbar.js";
import { controlMetrics } from "../tokens/control.js";
import { glassLift, glassSurface } from "../tokens/glass.js";
import { useInkTheme } from "./InkProvider.js";
import { renderIconSlot, type InkIconSlot } from "./icon.js";
import { inkText } from "./type.js";

export type InkNavbarVariant = "sticky" | "floating" | "static";

export interface InkNavbarAction {
  key: string;
  label: string;
  icon?: InkIconSlot;
  onPress?: () => void;
  primary?: boolean;
}

export interface InkNavbarProps {
  title?: ReactNode;
  lead?: ReactNode;
  trail?: ReactNode;
  actions?: InkNavbarAction[];
  variant?: InkNavbarVariant;
  collapse?: boolean;
  /** Drive it from your list's `onScroll` through `NavbarBehaviour`. */
  stage?: NavbarStage;
  /** Room for the status bar. A number rather than a safe-area dependency. */
  topInset?: number;
  /** `BlurView` from `expo-blur`, if the app has it. */
  blurComponent?: ComponentType<{
    intensity?: number;
    tint?: string;
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
  }>;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function InkNavbar({
  title,
  lead,
  trail,
  actions,
  variant = "floating",
  collapse = false,
  stage: forced,
  topInset = 0,
  blurComponent: Blur,
  style,
  children,
}: InkNavbarProps) {
  const theme = useInkTheme();
  const glass = glassSurface(theme);
  const metrics = controlMetrics("md");
  const [internal, setStage] = useState<NavbarStage>("expanded");
  const stage = forced ?? internal;
  const material = stageHasMaterial(stage);

  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.().then((v) => live && setReduceTransparency(v));
    const sub = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduceTransparency);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  /**
   * The morph.
   *
   * One driver, interpolated three ways. Width and radius cannot run on the
   * native driver — they are layout, not transform — so this is the one
   * animation in the library that runs on the JS thread, and it is short and
   * infrequent enough to be worth it. Opacity could be native-driven, but
   * splitting it across two drivers is how two halves of one gesture end up
   * fractionally out of step.
   */
  const collapsed = stage === "collapsed" ? 1 : 0;
  const progress = useRef(new Animated.Value(collapsed)).current;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!theme.animate) {
      progress.setValue(collapsed);
      return;
    }
    Animated.timing(progress, {
      toValue: collapsed,
      duration: theme.duration.slow,
      easing: Easing.bezier(...theme.easing),
      useNativeDriver: false,
    }).start();
  }, [collapsed, progress, theme.animate, theme.duration.slow, theme.easing]);

  const puckWidth = metrics.height + metrics.padY * 2;
  const barWidth =
    width > 0
      ? progress.interpolate({ inputRange: [0, 1], outputRange: [width, puckWidth] })
      : undefined;
  const bodyOpacity = progress.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0] });
  const puckOpacity = progress.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1] });
  const radius = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [variant === "floating" ? theme.radius.xl : 0, theme.radius.pill],
  });

  const primary = actions?.find((a) => a.primary) ?? actions?.[0];
  const shown = stage === "expanded" ? actions : stage === "condensed" ? (primary ? [primary] : []) : [];

  const heading = inkText(theme, {
    role: "display",
    size: "lg",
    weight: theme.weight.bold,
    tracking: "title",
    leading: "tight",
  });

  const body = (
    <Animated.View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: metrics.gap,
        opacity: bodyOpacity,
      }}
      pointerEvents={stage === "collapsed" ? "none" : "auto"}
    >
      {lead}
      {typeof title === "string" ? (
        <Text accessibilityRole="header" numberOfLines={1} style={[heading.style, { flexShrink: 1 }]}>
          {title}
        </Text>
      ) : (
        title
      )}
      <View style={{ flex: 1 }} />
      {trail}
      {shown?.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={{
            minWidth: metrics.height,
            minHeight: metrics.height,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: theme.space[2],
          }}
        >
          {renderIconSlot(action.icon) ?? <Text style={inkText(theme, { weight: theme.weight.semibold }).style}>{action.label}</Text>}
        </Pressable>
      ))}
    </Animated.View>
  );

  const content = (
    <View
      onLayout={(e) => width === 0 && setWidth(e.nativeEvent.layout.width)}
      style={{ paddingTop: topInset, paddingHorizontal: metrics.padY, paddingVertical: metrics.padY }}
    >
      {children ?? body}

      {collapse ? (
        <Animated.View
          style={{
            position: "absolute",
            right: metrics.padY,
            top: topInset + metrics.padY,
            opacity: puckOpacity,
          }}
          pointerEvents={stage === "collapsed" ? "auto" : "none"}
        >
          <Pressable
            accessibilityRole="button"
            // It shows the primary action's glyph and does not perform it: the
            // reader collapsed the bar by scrolling, not by choosing to.
            accessibilityLabel="Show navigation"
            accessibilityState={{ expanded: stage !== "collapsed" }}
            onPress={() => setStage("expanded")}
            style={{
              width: metrics.height,
              height: metrics.height,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: theme.edge.borderWidth,
              borderColor: theme.color.edge,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.color.surface,
            }}
          >
            {renderIconSlot(primary?.icon) ?? <PuckMark colour={theme.color.text} />}
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );

  const shell: Animated.WithAnimatedValue<ViewStyle> = {
    alignSelf: "flex-end",
    width: barWidth,
    overflow: "hidden",
    borderRadius: radius,
    borderBottomWidth: variant === "floating" || !material ? 0 : theme.edge.hairlineWidth,
    borderColor: theme.color.line,
    marginHorizontal: variant === "floating" ? theme.space[4] : 0,
    marginTop: variant === "floating" ? theme.space[3] : 0,
    ...(variant === "floating" && material ? glassLift(theme) : null),
    backgroundColor: !material
      ? "transparent"
      : reduceTransparency
        ? glass.solid
        : glass.background,
  };

  if (Blur && material && !reduceTransparency) {
    return (
      <Animated.View style={[shell, { backgroundColor: "transparent" }, style]}>
        <Blur intensity={60} tint={theme.scheme === "dark" ? "dark" : "light"} style={{ backgroundColor: glass.background }}>
          {content}
        </Blur>
      </Animated.View>
    );
  }

  return <Animated.View style={[shell, style]}>{content}</Animated.View>;
}

/** Three lines, drawn, so the library needs no icon set. */
function PuckMark({ colour }: { colour: string }) {
  const bar: ViewStyle = { width: 15, height: 2, borderRadius: 1, backgroundColor: colour };
  return (
    <View style={{ gap: 3 }}>
      <View style={bar} />
      <View style={bar} />
      <View style={bar} />
    </View>
  );
}
