/**
 * A hand-written stand-in for the parts of React Native this library touches.
 *
 * It exists so `tsconfig.native.json` can type-check `src/native` in a repo
 * that has no React Native installed — which is every repo this package lives
 * in until someone starts the Expo app. Inside a real Expo project you delete
 * the `paths` entry in that config and the real types take over; the surface
 * below is deliberately a subset, so anything that compiles here compiles
 * there, and nothing that compiles there is forbidden here.
 *
 * If you find yourself widening this file to make something type-check, that is
 * the signal to install React Native and check against the real thing instead.
 */
declare module "react-native" {
  import type { ComponentType, ReactNode, Ref } from "react";

  export type ColorValue = string;

  export interface FlexStyle {
    alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
    alignSelf?: "auto" | "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
    justifyContent?:
      | "flex-start"
      | "flex-end"
      | "center"
      | "space-between"
      | "space-around"
      | "space-evenly";
    flex?: number;
    flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
    flexGrow?: number;
    flexShrink?: number;
    flexWrap?: "wrap" | "nowrap" | "wrap-reverse";
    gap?: number;
    rowGap?: number;
    columnGap?: number;
    width?: number | string;
    height?: number | string;
    minWidth?: number | string;
    minHeight?: number | string;
    maxWidth?: number | string;
    maxHeight?: number | string;
    margin?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    marginHorizontal?: number;
    marginVertical?: number;
    padding?: number;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingHorizontal?: number;
    paddingVertical?: number;
    position?: "absolute" | "relative";
    top?: number | string;
    bottom?: number | string;
    left?: number | string;
    right?: number | string;
    overflow?: "visible" | "hidden" | "scroll";
    zIndex?: number;
  }

  export type TransformsStyle = {
    transform?: Array<
      | { translateX: number | AnimatedInterpolation }
      | { translateY: number | AnimatedInterpolation }
      | { rotateZ: string }
      | { scale: number | AnimatedInterpolation }
      | { rotate: string | AnimatedInterpolation }
      | { skewX: string }
      | { skewY: string }
    >;
  };

  export interface ViewStyle extends FlexStyle, TransformsStyle {
    backgroundColor?: ColorValue;
    borderColor?: ColorValue;
    borderTopColor?: ColorValue;
    borderBottomColor?: ColorValue;
    borderLeftColor?: ColorValue;
    borderRightColor?: ColorValue;
    borderWidth?: number;
    borderTopWidth?: number;
    borderBottomWidth?: number;
    borderLeftWidth?: number;
    borderRightWidth?: number;
    borderRadius?: number;
    shadowColor?: ColorValue;
    shadowOffset?: { width: number; height: number };
    shadowOpacity?: number;
    shadowRadius?: number;
    elevation?: number;
    borderTopLeftRadius?: number;
    borderTopRightRadius?: number;
    borderBottomLeftRadius?: number;
    borderBottomRightRadius?: number;
    opacity?: number;
  }

  export interface TextStyle extends ViewStyle {
    color?: ColorValue;
    fontFamily?: string;
    fontSize?: number;
    fontStyle?: "normal" | "italic";
    fontVariant?: string[];
    /** Android pads text for accents it may never draw; off, the box is the line. */
    includeFontPadding?: boolean;
    textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through";
    fontWeight?: number | string;
    letterSpacing?: number;
    lineHeight?: number;
    textAlign?: "auto" | "left" | "right" | "center";
    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  }

  export type StyleProp<T> = T | false | null | undefined | Array<StyleProp<T>>;

  export interface Insets {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }

  export type AccessibilityRole =
    | "none"
    | "button"
    | "link"
    | "header"
    | "text"
    | "switch"
    | "radio"
    | "radiogroup"
    | "checkbox"
    | "combobox"
    | "image"
    | "list"
    | "tab"
    | "tablist"
    | "menu"
    | "menuitem"
    | "progressbar"
    | "alert"
    | "summary"
    | "adjustable";

  export interface AccessibilityState {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | "mixed";
    busy?: boolean;
    expanded?: boolean;
  }

  export interface AccessibilityValue {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  }

  export interface AccessibilityProps {
    accessible?: boolean;
    accessibilityHint?: string;
    accessibilityRole?: AccessibilityRole;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityState?: AccessibilityState;
    accessibilityValue?: AccessibilityValue;
    accessibilityLiveRegion?: "none" | "polite" | "assertive";
    importantForAccessibility?: "auto" | "yes" | "no" | "no-hide-descendants";
    /** iOS half of hiding a decorative element. Android uses the line above. */
    accessibilityElementsHidden?: boolean;
    /** iOS: everything outside this view is hidden from VoiceOver while it shows. */
    accessibilityViewIsModal?: boolean;
    /** iOS: the two-finger Z scrub. */
    onAccessibilityEscape?: () => void;
    accessibilityActions?: ReadonlyArray<{ name: string; label?: string }>;
    onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void;
  }

  export interface ViewProps extends AccessibilityProps {
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
    pointerEvents?: "auto" | "none" | "box-none" | "box-only";
    onLayout?: (event: LayoutChangeEvent) => void;
    testID?: string;
    ref?: Ref<unknown>;
    [key: string]: unknown;
  }

  export interface TextProps extends AccessibilityProps {
    style?: StyleProp<TextStyle>;
    children?: ReactNode;
    numberOfLines?: number;
    testID?: string;
    ref?: Ref<unknown>;
  }

  export interface PressableStateCallbackType {
    pressed: boolean;
  }

  export interface PressableProps extends AccessibilityProps {
    onPress?: () => void;
    onLongPress?: () => void;
    onPressIn?: () => void;
    onPressOut?: () => void;
    onLongPress?: () => void;
    delayLongPress?: number;
    disabled?: boolean;
    hitSlop?: number | Insets;
    testID?: string;
    style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
    children?: ReactNode | ((state: PressableStateCallbackType) => ReactNode);
  }

  export interface LayoutChangeEvent {
    nativeEvent: { layout: { x: number; y: number; width: number; height: number } };
  }

  export interface TextInputProps extends AccessibilityProps {
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    placeholderTextColor?: ColorValue;
    editable?: boolean;
    multiline?: boolean;
    numberOfLines?: number;
    keyboardType?: "default" | "email-address" | "numeric" | "url" | "web-search";
    onFocus?: () => void;
    onBlur?: () => void;
    onSubmitEditing?: () => void;
    onContentSizeChange?: (event: {
      nativeEvent: { contentSize: { width: number; height: number } };
    }) => void;
    textAlignVertical?: "auto" | "top" | "bottom" | "center";
    selectionColor?: ColorValue;
    cursorColor?: ColorValue;
    returnKeyType?: "done" | "go" | "next" | "search" | "send";
    secureTextEntry?: boolean;
    scrollEnabled?: boolean;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    autoCorrect?: boolean;
    autoFocus?: boolean;
    maxLength?: number;
    style?: StyleProp<TextStyle>;
    testID?: string;
    ref?: Ref<unknown>;
  }

  export interface ModalProps {
    visible?: boolean;
    transparent?: boolean;
    animationType?: "none" | "slide" | "fade";
    onRequestClose?: () => void;
    onShow?: () => void;
    /** Android: the scrim reaches under the status bar rather than stopping at it. */
    statusBarTranslucent?: boolean;
    /** Android: and under the navigation bar. */
    navigationBarTranslucent?: boolean;
    supportedOrientations?: Array<"portrait" | "landscape" | "landscape-left" | "landscape-right">;
    children?: ReactNode;
  }

  export interface ScrollViewProps extends ViewProps {
    horizontal?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    showsVerticalScrollIndicator?: boolean;
    contentContainerStyle?: StyleProp<ViewStyle>;
    keyboardShouldPersistTaps?: "always" | "never" | "handled";
    alwaysBounceVertical?: boolean;
    contentOffset?: { x: number; y: number };
  }

  export interface ImageProps {
    source: { uri: string } | number;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
  }

  export const View: ComponentType<ViewProps>;
  export const TextInput: ComponentType<TextInputProps>;
  export const Modal: ComponentType<ModalProps>;
  export const ScrollView: ComponentType<ScrollViewProps>;
  export const Image: ComponentType<ImageProps>;

  export interface PanResponderGestureState {
    dx: number;
    dy: number;
    moveX: number;
    moveY: number;
    vx: number;
    vy: number;
  }

  export interface GestureResponderEvent {
    nativeEvent: { locationX: number; locationY: number; pageX: number; pageY: number };
  }

  export const PanResponder: {
    create(config: {
      onStartShouldSetPanResponder?: (e: GestureResponderEvent, g: PanResponderGestureState) => boolean;
      onMoveShouldSetPanResponder?: (e: GestureResponderEvent, g: PanResponderGestureState) => boolean;
      onPanResponderGrant?: (e: GestureResponderEvent, g: PanResponderGestureState) => void;
      onPanResponderMove?: (e: GestureResponderEvent, g: PanResponderGestureState) => void;
      onPanResponderRelease?: (e: GestureResponderEvent, g: PanResponderGestureState) => void;
      onPanResponderTerminate?: (e: GestureResponderEvent, g: PanResponderGestureState) => void;
      onPanResponderTerminationRequest?: (
        e: GestureResponderEvent,
        g: PanResponderGestureState,
      ) => boolean;
    }): { panHandlers: Record<string, unknown> };
  };

  export interface KeyboardEvent {
    duration?: number;
    endCoordinates: { height: number; screenY: number; width: number; screenX: number };
  }

  export const Keyboard: {
    addListener(
      event: "keyboardWillShow" | "keyboardDidShow" | "keyboardWillHide" | "keyboardDidHide",
      handler: (event: KeyboardEvent) => void,
    ): { remove(): void };
    dismiss(): void;
  };

  export function useWindowDimensions(): {
    width: number;
    height: number;
    scale: number;
    fontScale: number;
  };

  export function findNodeHandle(component: unknown): number | null;

  export const LayoutAnimation: {
    configureNext(config: {
      duration: number;
      update?: { type: "keyboard" | "easeInEaseOut" | "linear" | "spring" };
    }): void;
  };
  export const Text: ComponentType<TextProps>;
  export const Pressable: ComponentType<PressableProps>;

  export const StyleSheet: {
    create<T extends Record<string, ViewStyle | TextStyle>>(styles: T): T;
    absoluteFillObject: ViewStyle;
    flatten<T>(style: StyleProp<T>): T;
    hairlineWidth: number;
  };

  export const Platform: {
    OS: "ios" | "android" | "web" | "windows" | "macos";
    select<T>(spec: { ios?: T; android?: T; native?: T; default?: T }): T;
  };

  export interface AnimatedInterpolation {
    interpolate(config: {
      inputRange: number[];
      outputRange: number[] | string[];
      extrapolate?: "clamp" | "extend" | "identity";
    }): AnimatedInterpolation;
  }

  export class AnimatedValue implements AnimatedInterpolation {
    constructor(value: number);
    setValue(value: number): void;
    stopAnimation(callback?: (value: number) => void): void;
    addListener(callback: (state: { value: number }) => void): string;
    removeListener(id: string): void;
    interpolate(config: {
      inputRange: number[];
      outputRange: number[] | string[];
      extrapolate?: "clamp" | "extend" | "identity";
    }): AnimatedInterpolation;
  }

  export interface AnimatedComposite {
    start(callback?: (result: { finished: boolean }) => void): void;
    stop(): void;
  }

  export namespace Animated {
    type WithAnimatedValue<T> = { [K in keyof T]?: T[K] | AnimatedInterpolation };
    type Value = AnimatedValue;
    type CompositeAnimation = AnimatedComposite;
  }

  // Animated views accept an interpolation anywhere a style takes a number.
  export interface AnimatedViewProps extends Omit<ViewProps, "style"> {
    style?: StyleProp<Animated.WithAnimatedValue<ViewStyle>>;
  }
  export interface AnimatedTextProps extends Omit<TextProps, "style"> {
    style?: StyleProp<Animated.WithAnimatedValue<TextStyle>>;
  }

  export const Animated: {
    Value: typeof AnimatedValue;
    View: ComponentType<AnimatedViewProps>;
    Text: ComponentType<AnimatedTextProps>;
    timing(
      value: AnimatedValue,
      config: {
        toValue: number;
        duration: number;
        easing?: (value: number) => number;
        useNativeDriver: boolean;
      },
    ): AnimatedComposite;
    loop(animation: AnimatedComposite, config?: { iterations?: number }): AnimatedComposite;
    spring(
      value: AnimatedValue,
      config: {
        toValue: number;
        velocity?: number;
        stiffness?: number;
        damping?: number;
        mass?: number;
        restDisplacementThreshold?: number;
        restSpeedThreshold?: number;
        useNativeDriver: boolean;
      },
    ): AnimatedComposite;
    parallel(animations: AnimatedComposite[]): AnimatedComposite;
    sequence(animations: AnimatedComposite[]): AnimatedComposite;
    delay(time: number): AnimatedComposite;
    add(a: AnimatedInterpolation, b: AnimatedInterpolation): AnimatedInterpolation;
  };

  export const Easing: {
    bezier(x1: number, y1: number, x2: number, y2: number): (value: number) => number;
    linear: (value: number) => number;
    ease: (value: number) => number;
    inOut(easing: (value: number) => number): (value: number) => number;
    out(easing: (value: number) => number): (value: number) => number;
    cubic: (value: number) => number;
  };

  export const AccessibilityInfo: {
    isReduceMotionEnabled(): Promise<boolean>;
    isReduceTransparencyEnabled(): Promise<boolean>;
    sendAccessibilityEvent(handle: unknown, event: "focus"): void;
    addEventListener(
      type: "reduceMotionChanged" | "reduceTransparencyChanged",
      handler: (enabled: boolean) => void,
    ): { remove(): void };
  };
}
