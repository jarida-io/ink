/**
 * The glass bar, on native.
 *
 * Same props, same material, one honest gap: **React Native cannot blur what is
 * behind a view.** There is no `backdrop-filter`, and there is no way to add
 * one — it is a compositor capability, not a style.
 *
 * The usual answer is `expo-blur`, which is a real native blur and a real extra
 * dependency. This library does not take that dependency on a consumer's
 * behalf, so `blurComponent` is a slot: pass `BlurView` and the bar blurs; pass
 * nothing and it renders the derived tint alone.
 *
 * That fallback is not a degradation worth apologising for, and it is worth
 * saying why. The tint was never the decoration — it is the part carrying the
 * legibility guarantee, derived so the title clears 4.5:1 over any backdrop.
 * The blur is the part that makes it look like glass. A bar without it is a
 * translucent bar rather than a glass one, and it is exactly as readable.
 */
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { AccessibilityInfo, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { glassSurface } from "../tokens/glass.js";
import { useInkTheme } from "./InkProvider.js";
import { inkText, slantTransform } from "./type.js";

export type InkNavbarVariant = "sticky" | "floating" | "static";

export interface InkNavbarProps {
  title?: ReactNode;
  lead?: ReactNode;
  trail?: ReactNode;
  variant?: InkNavbarVariant;
  /**
   * Whether content has scrolled under the bar.
   *
   * The web derives this from a sentinel; there is no IntersectionObserver
   * here, so pass it from your list's `onScroll` — or leave it out and the bar
   * always carries the material, which is the safe default.
   */
  scrolled?: boolean;
  /** Room for the status bar. A number rather than a safe-area dependency. */
  topInset?: number;
  /** `BlurView` from `expo-blur`, if the app has it. */
  blurComponent?: ComponentType<{ intensity?: number; tint?: string; style?: StyleProp<ViewStyle>; children?: ReactNode }>;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function InkNavbar({
  title,
  lead,
  trail,
  variant = "sticky",
  scrolled = true,
  topInset = 0,
  blurComponent: Blur,
  style,
  children,
}: InkNavbarProps) {
  const theme = useInkTheme();
  const glass = glassSurface(theme);
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.().then((value) => {
      if (live) setReduceTransparency(value);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduceTransparency,
    );
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  const heading = inkText(theme, {
    role: "display",
    size: "lg",
    weight: theme.weight.bold,
    italic: true,
    tracking: "title",
    leading: "tight",
  });

  const floating = variant === "floating";
  const material: ViewStyle = {
    backgroundColor: !scrolled
      ? "transparent"
      : reduceTransparency
        ? glass.solid
        : glass.background,
    borderBottomWidth: floating || !scrolled ? 0 : 1,
    borderColor: theme.color.line,
    borderRadius: floating ? theme.radius.xl : 0,
    marginHorizontal: floating ? theme.space[4] : 0,
    marginTop: floating ? theme.space[3] : 0,
    paddingTop: topInset,
    overflow: "hidden",
  };

  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.space[4],
        minHeight: theme.touch.tapMin,
        paddingVertical: theme.space[2],
        paddingHorizontal: theme.space[4],
      }}
    >
      {lead}
      {typeof title === "string" ? (
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[
            heading.style,
            heading.slant ? { transform: slantTransform(heading.slant) } : null,
            { flexShrink: 1 },
          ]}
        >
          {title}
        </Text>
      ) : (
        title
      )}
      <View style={{ flex: 1 }} />
      {trail}
    </View>
  );

  const content = children ?? body;

  // The blur slot only earns its place while the material is on and the user
  // has not asked for less of it.
  if (Blur && scrolled && !reduceTransparency) {
    return (
      <View style={[material, { backgroundColor: "transparent" }, style]}>
        <Blur
          intensity={60}
          tint={theme.scheme === "dark" ? "dark" : "light"}
          style={{ backgroundColor: glass.background }}
        >
          {content}
        </Blur>
      </View>
    );
  }

  return <View style={[material, style]}>{content}</View>;
}
