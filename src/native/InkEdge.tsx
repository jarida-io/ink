/**
 * The edge, as two views.
 *
 * ## Why not `boxShadow`
 *
 * Recent React Native can take a `boxShadow` string, and on a new enough
 * version this could have been a one-liner. It is not, for three reasons that
 * all matter more than the line count:
 *
 * 1. **The plate is the honest model.** `tokens/edge.ts` works out that the
 *    plate never moves in any of the three states — only the face does. Two
 *    views say that; a shadow whose offset changes and a transform that
 *    cancels it out says it by accident.
 * 2. **It renders the same everywhere.** No version gate, no `Platform.select`,
 *    no difference between the New and old architecture, no iOS shadow
 *    properties quietly ignoring `shadowRadius: 0`.
 * 3. **It reserves its own space.** A shadow costs no layout, so on the web a
 *    grid of ink cards has its plates overlapping the gutter. Here the plate is
 *    a real view inside a real box, so a row of cards spaces correctly without
 *    anyone hand-tuning the gap.
 *
 * ## The geometry, and why nothing overflows
 *
 * The outer view has **no padding**, which is the detail that makes this
 * version-proof: absolute insets are measured from the padding box in CSS and
 * historically from the content box in Yoga, and with zero padding the two are
 * the same rectangle. So `left/top: plate, right/bottom: 0` is unambiguous.
 *
 *     outer:  sized by the face plus `plate` on the trailing edges
 *     plate:  (plate, plate) to (W, H) — exactly the face's size, offset down-right
 *     face:   (0, 0) to (W - plate, H - plate), translated by `shift`
 *
 * At rest `shift` is 0 and at pressed it is +plate, which puts the face exactly
 * on the plate and exactly inside the outer. It never overflows, so Android's
 * clipping is not a consideration.
 *
 * The one state that would overflow is `raised` (`shift` of -3), and it is
 * unreachable here: `edgeStateFor("native", …)` never returns it, because a
 * finger has no hover.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, View, type StyleProp, type ViewStyle } from "react-native";
import { plateRadius, resolveEdge } from "../core/edge.js";
import { useEdgeBudget } from "../shared/budget.js";
import type { InkEdgeTokens, InkState } from "../tokens/edge.js";
import { useInkTheme } from "./InkProvider.js";

export interface InkEdgeProps {
  /** False draws a hairline and no plate — the unchosen state. */
  raised?: boolean;
  state?: InkState;
  radius?: number;
  /** Use `theme.edgeCompact` for controls small enough that 4px reads as toppling. */
  edge?: InkEdgeTokens;
  /** Layout: flex, width, margin. Goes on the outer box. */
  style?: StyleProp<ViewStyle>;
  /** Looks: padding, gap, alignment. Goes on the face. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Counts against the screen's edge budget. Off for a purely decorative use. */
  budgeted?: boolean;
  children?: ReactNode;
}

export function InkEdge({
  raised = true,
  state = "rest",
  radius,
  edge,
  style,
  contentStyle,
  budgeted = true,
  children,
}: InkEdgeProps) {
  const theme = useInkTheme();
  const tokens = edge ?? theme.edge;
  const faceRadius = radius ?? theme.radius.lg;
  const geometry = resolveEdge(state, tokens);

  useEdgeBudget(budgeted && raised);

  const shift = useRef(new Animated.Value(geometry.shift)).current;

  useEffect(() => {
    if (!theme.animate) {
      shift.setValue(geometry.shift);
      return;
    }
    Animated.timing(shift, {
      toValue: geometry.shift,
      duration: theme.duration.lift,
      easing: Easing.bezier(...theme.easing),
      // Only the face translates, and translate is native-driver safe — so the
      // press stays at frame rate even while the JS thread is busy, which on a
      // six-core board sharing itself with a language model is most of the time.
      useNativeDriver: true,
    }).start();
  }, [geometry.shift, theme.animate, theme.duration.lift, theme.easing, shift]);

  return (
    <View style={style}>
      {raised ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: geometry.plate,
            top: geometry.plate,
            right: 0,
            bottom: 0,
            backgroundColor: theme.color.ink,
            borderRadius: plateRadius(faceRadius, geometry.plate),
          }}
        />
      ) : null}
      <Animated.View
        style={[
          {
            marginRight: geometry.plate,
            marginBottom: geometry.plate,
            backgroundColor: theme.color.surface,
            borderWidth: raised ? tokens.borderWidth : tokens.hairlineWidth,
            borderColor: raised ? theme.color.edge : theme.color.line,
            borderRadius: faceRadius,
            transform: [{ translateX: shift }, { translateY: shift }],
          },
          contentStyle,
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}
