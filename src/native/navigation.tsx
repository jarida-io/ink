/**
 * The three navigation shapes, on native. Same names, same props.
 *
 * The shared decisions — how many fit, when the labels come off, what a badge
 * says — are in `@jarida/ink/headless`, so a bar on a phone and a bar in a
 * browser cap at the same number and drop their labels at the same width.
 */
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { stageHasMaterial, type NavbarStage } from "../headless/navbar.js";
import { BAR_MAX, badgeText, fitBar, shapeFor, type NavDestination, type NavShape } from "../headless/nav.js";
import { DISABLED_OPACITY } from "../tokens/control.js";
import { glassLift, glassSurface } from "../tokens/glass.js";
import { useInkInsets, useInkTheme } from "./InkProvider.js";
import { IconPaintProvider, renderIconSlot, type InkIconSlot } from "./icon.js";
import { inkText } from "./type.js";

export interface InkNavDestination extends NavDestination {
  icon?: InkIconSlot;
}

interface CommonProps {
  label: string;
  items: InkNavDestination[];
  value: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}

function Badge({ badge }: { badge: InkNavDestination["badge"] }) {
  const theme = useInkTheme();
  const text = badgeText(badge);
  if (text === null) return null;
  const dot = text === "";
  const style = inkText(theme, {
    role: "mono",
    size: "xs",
    weight: theme.weight.bold,
    color: theme.color.textOnAccent,
  });
  return (
    <View
      style={{
        position: "absolute",
        top: -6,
        left: "60%",
        minWidth: dot ? theme.space[2] : theme.space[4],
        height: dot ? theme.space[2] : theme.space[4],
        paddingHorizontal: dot ? 0 : theme.space[1],
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.radius.pill,
        backgroundColor: theme.color.accent,
      }}
    >
      {dot ? null : <Text style={[style.style, { fontSize: 9, lineHeight: 10 }]}>{text}</Text>}
    </View>
  );
}

/** The same badge, in flow rather than over the glyph. */
function BadgeInline({ badge }: { badge: InkNavDestination["badge"] }) {
  const theme = useInkTheme();
  const text = badgeText(badge);
  if (text === null) return null;
  const dot = text === "";
  const style = inkText(theme, {
    role: "mono",
    size: "xs",
    weight: theme.weight.bold,
    color: theme.color.textOnAccent,
  });
  return (
    <View
      style={{
        minWidth: dot ? theme.space[2] : theme.space[4],
        height: dot ? theme.space[2] : theme.space[4],
        paddingHorizontal: dot ? 0 : theme.space[1],
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.radius.pill,
        backgroundColor: theme.color.accent,
      }}
    >
      {dot ? null : <Text style={[style.style, { fontSize: 9, lineHeight: 10 }]}>{text}</Text>}
    </View>
  );
}

/* ── Bottom bar ────────────────────────────────────────────────────────── */

export interface InkBottomBarProps extends CommonProps {
  moreLabel?: string;
  moreIcon?: InkIconSlot;
  onMore?: (overflow: InkNavDestination[]) => void;
  /** Home-indicator inset. A number rather than a safe-area dependency. */
  bottomInset?: number;
  /** `floating` lifts it off the edge as a rounded pill. */
  variant?: "docked" | "floating";
  material?: "auto" | "always" | "never";
  /** Contract to a single button, exactly as the navbar does. */
  collapse?: boolean;
  /** Pass from your list's `onScroll`; there is no window to watch here. */
  stage?: NavbarStage;
  /** Told when the contracted bar is pressed, in place of expanding itself. */
  onExpand?: () => void;
  /** `BlurView` from `expo-blur`, if the app has it. The same slot as the navbar's. */
  blurComponent?: ComponentType<{
    intensity?: number;
    /** Only ever "light" or "dark", so expo-blur's own union accepts it. */
    tint?: "light" | "dark";
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
  }>;
}

export function InkBottomBar({
  label,
  items,
  value,
  onChange,
  moreLabel = "More",
  moreIcon,
  onMore,
  bottomInset: givenInset,
  variant = "floating",
  material = "auto",
  collapse = false,
  stage: forced,
  onExpand,
  blurComponent: Blur,
  style,
}: InkBottomBarProps) {
  const theme = useInkTheme();
  // The provider's inset unless the caller knows better, so a bar placed
  // under the home indicator clears it without being told.
  const insets = useInkInsets();
  const bottomInset = givenInset ?? insets.bottom;
  const glass = glassSurface(theme);
  const [width, setWidth] = useState(0);
  const [pushed, setPushed] = useState<NavbarStage | null>(null);
  const stage = pushed ?? forced ?? "expanded";
  // A press on the puck asks for the bar back; it does not ask for the bar to
  // stop answering the scroll. Without this the push outlives the stage that
  // provoked it and `collapse` works exactly once.
  useEffect(() => setPushed(null), [forced]);
  const hasMaterial =
    material === "always" ? true : material === "never" ? false : stageHasMaterial(stage);
  const collapsed = stage === "collapsed";
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
  // The blur sits behind the content rather than around it, so the shell keeps
  // its padding, its morph and its puck; the tint rides on the blur.
  const blurred = Boolean(Blur) && hasMaterial && !reduceTransparency;
  const current = items.find((i) => i.key === value);
  const layout = fitBar(items, width);
  const inOverflow = layout.overflow.some((i) => i.key === value);

  // The same morph as the navbar: one driver, width and opacity interpolated
  // from it. Width is layout, so this cannot use the native driver.
  const progress = useRef(new Animated.Value(collapsed ? 1 : 0)).current;
  useEffect(() => {
    if (!theme.animate) {
      progress.setValue(collapsed ? 1 : 0);
      return;
    }
    Animated.timing(progress, {
      toValue: collapsed ? 1 : 0,
      duration: theme.duration.slow,
      easing: Easing.bezier(...theme.easing),
      useNativeDriver: false,
    }).start();
  }, [collapsed, progress, theme.animate, theme.duration.slow, theme.easing]);

  const puckWidth = theme.touch.tapMin + theme.space[2] * 2;
  const barWidth =
    width > 0
      ? progress.interpolate({ inputRange: [0, 1], outputRange: [width, puckWidth] })
      : undefined;
  const bodyOpacity = progress.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0] });
  const puckOpacity = progress.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1] });
  const floating = variant === "floating";

  const slot = (
    item: { key: string; label: string; icon?: InkIconSlot; badge?: NavDestination["badge"]; disabled?: boolean },
    selected: boolean,
    onPress: () => void,
  ) => {
    const text = inkText(theme, {
      size: "sm",
      weight: theme.weight.semibold,
      color: selected ? theme.color.text : theme.color.textSecondary,
    });
    return (
      <Pressable
        key={item.key}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected, disabled: item.disabled }}
        disabled={item.disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          minHeight: theme.touch.tapMin,
          alignItems: "center",
          justifyContent: "center",
          gap: theme.space[1],
          paddingVertical: theme.space[1],
          borderRadius: theme.radius.lg,
          backgroundColor: pressed ? theme.color.pressed : undefined,
          opacity: item.disabled ? DISABLED_OPACITY : 1,
        })}
      >
        {/* The mark, above the icon where a thumb is not covering it. Selection
            is never carried by colour alone. */}
        <View
          style={{
            position: "absolute",
            top: 2,
            width: theme.space[5],
            height: 3,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.color.accentLine,
            opacity: selected ? 1 : 0,
          }}
        />
        <View>
          <IconPaintProvider value={text.style.color as string}>{renderIconSlot(item.icon, 24)}</IconPaintProvider>
          <Badge badge={item.badge} />
        </View>
        {layout.iconsOnly ? null : (
          <Text numberOfLines={1} style={text.style}>
            {item.label}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <Animated.View
      accessibilityLabel={label}
      onLayout={(e: LayoutChangeEvent) => width === 0 && setWidth(e.nativeEvent.layout.width)}
      style={[
        {
          alignSelf: "flex-end",
          width: barWidth,
          overflow: "hidden",
          paddingHorizontal: theme.space[2],
          paddingTop: theme.space[1],
          paddingBottom: floating ? theme.space[1] : Math.max(theme.space[1], bottomInset),
          borderTopWidth: floating || !hasMaterial ? 0 : theme.edge.hairlineWidth,
          borderColor: theme.color.line,
          borderRadius: collapsed ? theme.radius.pill : floating ? theme.radius.xl : 0,
          ...(floating && hasMaterial ? glassLift(theme) : null),
          marginHorizontal: floating ? theme.space[4] : 0,
          marginBottom: floating ? Math.max(theme.space[3], bottomInset) : 0,
          backgroundColor: !hasMaterial || blurred
            ? "transparent"
            : reduceTransparency
              ? glass.solid
              : glass.background,
        },
        style,
      ]}
    >
      {blurred && Blur ? (
        <Blur
          intensity={60}
          tint={theme.scheme === "dark" ? "dark" : "light"}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: glass.background }}
        />
      ) : null}
      <Animated.View
        style={{ flexDirection: "row", gap: theme.space[1], opacity: bodyOpacity }}
        pointerEvents={collapsed ? "none" : "auto"}
      >
        {layout.shown.map((item) => slot(item, item.key === value, () => onChange(item.key)))}
        {layout.overflow.length > 0
          ? slot(
              { key: "__more", label: moreLabel, icon: moreIcon },
              // The current destination can be inside the overflow, and the
              // bar has to say so or nothing appears selected anywhere.
              inOverflow,
              () => onMore?.(layout.overflow),
            )
          : null}
      </Animated.View>

      {collapse ? (
        <Animated.View
          style={{
            position: "absolute",
            right: theme.space[2],
            top: theme.space[1],
            opacity: puckOpacity,
          }}
          pointerEvents={collapsed ? "auto" : "none"}
        >
          <Pressable
            accessibilityRole="button"
            // Shows where you are; pressing it restores the bar rather than
            // navigating. The reader contracted it by scrolling.
            accessibilityLabel="Show navigation"
            accessibilityState={{ expanded: !collapsed }}
            onPress={() => (onExpand ? onExpand() : setPushed("expanded"))}
            style={{
              width: theme.touch.tapMin,
              height: theme.touch.tapMin,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {renderIconSlot(current?.icon, 24) ?? renderIconSlot(moreIcon, 24)}
          </Pressable>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/* ── Sidebar and rail ──────────────────────────────────────────────────── */

export interface InkNavSection {
  label?: string;
  items: InkNavDestination[];
}

export interface InkSidebarProps {
  label: string;
  sections: InkNavSection[];
  value: string;
  onChange: (key: string) => void;
  variant?: "sidebar" | "rail";
  /** Rounded and lifted off the content, as the bars are. */
  floating?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  onToggle?: () => void;
  topInset?: number;
  style?: StyleProp<ViewStyle>;
}

export function InkSidebar({
  label,
  sections,
  value,
  onChange,
  variant = "sidebar",
  floating = true,
  header,
  footer,
  topInset = 0,
  style,
}: InkSidebarProps) {
  const theme = useInkTheme();
  const rail = variant === "rail";

  return (
    <View
      accessibilityLabel={label}
      style={[
        {
          width: rail ? 68 : 248,
          height: "100%",
          gap: theme.space[4],
          paddingTop: Math.max(theme.space[4], topInset),
          paddingBottom: theme.space[4],
          paddingHorizontal: theme.space[2],
          // The glass, not a solid chrome fill — the same material the bar and
          // the navbar wear. The rule stays, because a boundary that depends on
          // a blur landing is a boundary that sometimes is not there.
          backgroundColor: glassSurface(theme).background,
          borderRightWidth: floating ? 0 : theme.edge.hairlineWidth,
          borderWidth: floating ? theme.edge.hairlineWidth : 0,
          borderColor: theme.color.line,
          borderRadius: floating ? theme.radius.xl : 0,
          margin: floating ? theme.space[3] : 0,
          alignItems: rail ? "center" : "stretch",
          ...(floating ? glassLift(theme) : null),
        },
        style,
      ]}
    >
      {header ? <View style={{ paddingHorizontal: theme.space[2] }}>{header}</View> : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: theme.space[5] }}>
        {sections.map((section, index) => (
          <View key={section.label ?? `section-${index}`} style={{ gap: 2 }}>
            {section.label && !rail ? (
              <Text
                style={[
                  inkText(theme, {
                    role: "mono",
                    size: "xs",
                    weight: theme.weight.bold,
                    tracking: "eyebrow",
                    uppercase: true,
                    color: theme.color.textTertiary,
                  }).style,
                  { paddingHorizontal: theme.space[3], paddingBottom: theme.space[1] },
                ]}
              >
                {section.label}
              </Text>
            ) : null}
            {section.label && rail && index > 0 ? (
              <View
                style={{
                  height: theme.edge.hairlineWidth,
                  marginVertical: theme.space[2],
                  marginHorizontal: theme.space[3],
                  backgroundColor: theme.color.line,
                }}
              />
            ) : null}
            {section.items.map((item) => {
              const selected = item.key === value;
              const text = inkText(theme, {
                size: "sm",
                weight: theme.weight.semibold,
                color: selected ? theme.color.text : theme.color.textSecondary,
              });
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  // A rail has no visible label, so the accessible name has to
                  // come from the destination. This is why `label` is a string.
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected, disabled: item.disabled }}
                  disabled={item.disabled}
                  onPress={() => onChange(item.key)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: rail ? "center" : "flex-start",
                    gap: theme.space[2],
                    minHeight: theme.touch.tapMin,
                    width: rail ? theme.touch.tapMin : undefined,
                    paddingHorizontal: rail ? 0 : theme.space[3],
                    borderRadius: theme.radius.md,
                    backgroundColor: selected
                      ? theme.color.accentSoft
                      : pressed
                        ? theme.color.pressed
                        : "transparent",
                    opacity: item.disabled ? DISABLED_OPACITY : 1,
                  })}
                >
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      width: 3,
                      height: theme.space[5],
                      borderRadius: theme.radius.pill,
                      backgroundColor: theme.color.accentLine,
                      opacity: selected ? 1 : 0,
                    }}
                  />
                  <View>
                    <IconPaintProvider value={text.style.color as string}>
                      {renderIconSlot(item.icon)}
                    </IconPaintProvider>
                    {/* On a rail the badge sits on the glyph, because that is
                        all there is. With a label it goes to the end of the
                        row — on the glyph it prints through the first word. */}
                    {rail ? <Badge badge={item.badge} /> : null}
                  </View>
                  {rail ? null : (
                    <>
                      <Text numberOfLines={1} style={[text.style, { flexShrink: 1 }]}>
                        {item.label}
                      </Text>
                      <View style={{ flex: 1 }} />
                      <BadgeInline badge={item.badge} />
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {footer ? <View style={{ paddingHorizontal: theme.space[2] }}>{footer}</View> : null}
    </View>
  );
}

/* ── The chooser ───────────────────────────────────────────────────────── */

export interface InkNavProps extends CommonProps {
  width: number;
  shape?: NavShape;
  sections?: InkNavSection[];
  header?: ReactNode;
  footer?: ReactNode;
}

export function InkNav({ width, shape, items, sections, ...rest }: InkNavProps) {
  const chosen = shape ?? shapeFor(width);
  const grouped = sections ?? [{ items }];
  if (chosen === "bar") return <InkBottomBar items={items} {...rest} />;
  return <InkSidebar sections={grouped} variant={chosen === "rail" ? "rail" : "sidebar"} {...rest} />;
}

export { BAR_MAX };
