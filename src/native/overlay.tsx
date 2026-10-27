/**
 * The one modal shell under the dialog, the sheet and the drawer.
 *
 * `Modal`'s own animations move the whole layer as one piece: `slide` drags the
 * dimming up from the bottom along with the sheet, and `fade` fades the panel
 * as flat as the scrim. Here the Modal only mounts. The scrim fades, the panel
 * moves on a spring, and a closing panel stays mounted until it has finished
 * leaving — so it can be caught and reopened halfway, from where it is.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SPRING, projectMomentum, rubberband } from "../tokens/motion.js";
import { useInkInsets, useInkTheme } from "./InkProvider.js";
import { springTo } from "./motion.js";

export type OverlayPlacement = "center" | "bottom" | "start" | "end";

export interface OverlayProps {
  open: boolean;
  /** Absent means it must be answered: no backdrop tap, no back button, no drag. */
  onDismiss?: () => void;
  placement: OverlayPlacement;
  /** Bottom only. A drag on `header` follows the finger, and a flick down closes it. */
  draggable?: boolean;
  /** Where a screen reader lands when it opens, rather than on the screen behind it. */
  focusRef?: RefObject<unknown>;
  header?: ReactNode;
  panelStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

const FILL: ViewStyle = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 };

/** The widths the web stylesheet uses too, so a panel is the same size on both. */
export const OVERLAY_WIDTH = { dialog: 480, sheet: 640, side: 400, drawer: 360, backdrop: 320 } as const;

/**
 * Whether a scroller is hiding content past either edge. Feeds the hairline
 * that appears only when there is something under it, rather than a divider
 * drawn whether or not anything scrolls.
 */
export function useScrollEdges() {
  const box = useRef({ view: 0, content: 0, offset: 0 }).current;
  const [above, setAbove] = useState(false);
  const [below, setBelow] = useState(false);
  const update = () => {
    setAbove(box.offset > 1);
    setBelow(box.offset + box.view < box.content - 1);
  };
  return {
    above,
    below,
    scrollProps: {
      scrollEventThrottle: 16,
      onLayout: (e: LayoutChangeEvent) => {
        box.view = e.nativeEvent.layout.height;
        update();
      },
      onContentSizeChange: (_width: number, height: number) => {
        box.content = height;
        update();
      },
      onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        box.offset = e.nativeEvent.contentOffset.y;
        update();
      },
    },
  };
}

/** Always laid out, so the content does not jump when it appears. */
export function EdgeLine({ shown }: { shown: boolean }) {
  const theme = useInkTheme();
  return (
    <View
      pointerEvents="none"
      style={{ height: theme.edge.hairlineWidth, backgroundColor: shown ? theme.color.line : "transparent" }}
    />
  );
}

export function Overlay({
  open,
  onDismiss,
  placement,
  draggable = false,
  focusRef,
  header,
  panelStyle,
  children,
}: OverlayProps) {
  const theme = useInkTheme();
  const insets = useInkInsets();
  const screen = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  const [size, setSize] = useState(0);
  const [frameHeight, setFrameHeight] = useState(0);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const fling = useRef(0);
  const edge = placement !== "center";
  const vertical = placement === "bottom";

  if (open && !mounted) setMounted(true);

  const reach = size || (vertical ? screen.height : screen.width);
  const live = useRef({ open, onDismiss, reach });
  live.current = { open, onDismiss, reach };

  useEffect(() => {
    if (!mounted) return;
    // An edge panel cannot travel until it knows how far it has to go.
    if (open && edge && size === 0) return;
    const target = open ? 1 : 0;
    const velocity = fling.current;
    fling.current = 0;
    const animation = theme.animate
      ? springTo(progress, target, {
          spring: open ? SPRING.default : SPRING.snappy,
          velocity,
          rest: 0.001,
        })
      : Animated.timing(progress, {
          toValue: target,
          duration: theme.duration.fast,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
    animation.start(({ finished }) => {
      if (finished && !live.current.open) setMounted(false);
    });
    return () => animation.stop();
  }, [open, mounted, edge, size, theme.animate, theme.duration.fast, progress]);

  useEffect(() => {
    if (!mounted) return;
    // iOS announces the keyboard before it moves, so the panel can move with it.
    // Android only says so afterwards.
    const ios = Platform.OS === "ios";
    const follow = (top: number | null, duration?: number) => {
      if (ios) LayoutAnimation.configureNext({ duration: duration || 250, update: { type: "keyboard" } });
      setKeyboardTop(top);
    };
    const show = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", (e) =>
      follow(e.endCoordinates.screenY, e.duration),
    );
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", (e) =>
      follow(null, e.duration),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [mounted]);

  const drag = useRef({ from: 0, at: 0 }).current;
  const responder = useMemo(
    () =>
      PanResponder.create({
        // Claimed only once the finger has clearly gone vertical, so a tap on
        // anything in the header is still a tap.
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => {
          drag.from = 0;
          progress.stopAnimation((value) => {
            drag.from = (1 - value) * live.current.reach;
          });
        },
        onPanResponderMove: (_e, g) => {
          const raw = drag.from + g.dy;
          // Down follows the finger; up resists, because there is nothing above.
          drag.at = raw >= 0 ? raw : -rubberband(-raw, live.current.reach);
          progress.setValue(1 - drag.at / live.current.reach);
        },
        onPanResponderRelease: (_e, g) => settle(g.vy * 1000),
        onPanResponderTerminate: () => settle(0),
        onPanResponderTerminationRequest: () => false,
      }),
    // Built once: `settle` reads everything that changes through refs.
    [],
  );

  function settle(reported: number) {
    // A velocity the platform could not measure must not reach the spring:
    // NaN there freezes the panel wherever the finger let go.
    const velocity = Number.isFinite(reported) ? reported : 0;
    const { reach: distance, onDismiss: dismiss } = live.current;
    // Judged on where the flick is heading, not where the finger let go.
    const landing = drag.at + projectMomentum(velocity);
    const back = () =>
      springTo(progress, 1, { spring: SPRING.momentum, velocity: -velocity / distance, rest: 0.001 }).start();
    if (dismiss && landing > distance / 2) {
      fling.current = -velocity / distance;
      dismiss();
      // A caller that keeps it open gets it back rather than a sheet left hanging.
      requestAnimationFrame(() => {
        if (live.current.open) back();
      });
    } else {
      back();
    }
  }

  const onShow = () => {
    if (!focusRef) return;
    requestAnimationFrame(() => {
      const target = focusRef.current as Parameters<typeof AccessibilityInfo.sendAccessibilityEvent>[0];
      // Absent on react-native-web; a missed focus is better than a crash.
      if (target) AccessibilityInfo.sendAccessibilityEvent?.(target, "focus");
    });
  };

  // How much of this frame the keyboard covers, rather than how tall it is.
  // An Android window the system has already shrunk is covered by nothing, and
  // lifting it by the keyboard's height as well put the panel twice as high.
  const keyboard = keyboardTop == null ? 0 : Math.max(0, Math.round((frameHeight || screen.height) - keyboardTop));

  const travel = vertical ? reach : placement === "start" ? -reach : reach;
  const motion: ViewStyle | Record<string, unknown> = !theme.animate
    ? { opacity: progress }
    : edge
      ? {
          transform: [
            vertical
              ? { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [travel, 0] }) }
              : {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [travel, 0],
                    extrapolate: "clamp",
                  }),
                },
          ],
        }
      : {
          opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
        };

  const frame: ViewStyle =
    placement === "center"
      ? {
          alignItems: "center",
          justifyContent: "center",
          paddingTop: insets.top + theme.space[6],
          paddingBottom: Math.max(insets.bottom, keyboard) + theme.space[6],
          paddingLeft: insets.left + theme.space[6],
          paddingRight: insets.right + theme.space[6],
        }
      : placement === "bottom"
        ? {
            justifyContent: "flex-end",
            paddingTop: insets.top + theme.space[6],
            paddingBottom: keyboard,
            // Clear of a landscape notch; a side panel pads its own content instead.
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }
        : { alignItems: placement === "start" ? "flex-start" : "flex-end" };

  const measure = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const next = Math.ceil(vertical ? height : width);
    if (next > 0 && next !== size) setSize(next);
  };

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      // Android's back button. A dialog that must be answered refuses it.
      onRequestClose={() => onDismiss?.()}
      onShow={onShow}
      statusBarTranslucent
      supportedOrientations={["portrait", "landscape"]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          FILL,
          {
            backgroundColor: theme.color.scrim,
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }),
          },
        ]}
      />
      {/* For a thumb. The announced ways out are the escape gesture and back. */}
      <Pressable accessible={false} disabled={!onDismiss} onPress={onDismiss} style={FILL} />
      <View
        pointerEvents="box-none"
        onLayout={(e) => setFrameHeight(Math.round(e.nativeEvent.layout.height))}
        style={[{ flex: 1 }, frame]}
      >
        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={onDismiss}
          onLayout={edge ? measure : undefined}
          style={[
            { flexShrink: 1 },
            placement === "center" ? { width: "100%", maxWidth: OVERLAY_WIDTH.dialog } : null,
            // On a tablet or a phone on its side, a sheet the width of the
            // screen is a banner; it stays on the bottom edge, centred.
            vertical ? { width: "100%", maxWidth: OVERLAY_WIDTH.sheet, alignSelf: "center" } : null,
            placement === "start" || placement === "end" ? { flex: 1, maxWidth: "88%" } : null,
            panelStyle,
            // Above the home indicator at rest; with the keyboard up that edge
            // is covered anyway, so the panel stops paying for it.
            vertical
              ? { paddingBottom: keyboard ? theme.space[3] : Math.max(theme.space[5], insets.bottom + theme.space[2]) }
              : null,
            motion as ViewStyle,
          ]}
        >
          {header ? (
            <View {...(draggable && onDismiss && vertical ? responder.panHandlers : {})}>{header}</View>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
