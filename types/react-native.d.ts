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
      | { scale: number | AnimatedInterpolation }
      | { rotate: string }
      | { skewX: string }
      | { skewY: string }
    >;
  };

  export interface ViewStyle extends FlexStyle, TransformsStyle {
    backgroundColor?: ColorValue;
    borderColor?: ColorValue;
    borderWidth?: number;
    borderTopWidth?: number;
    borderBottomWidth?: number;
    borderLeftWidth?: number;
    borderRightWidth?: number;
    borderRadius?: number;
    opacity?: number;
  }

  export interface TextStyle extends ViewStyle {
    color?: ColorValue;
    fontFamily?: string;
    fontSize?: number;
    fontStyle?: "normal" | "italic";
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
    | "progressbar"
    | "alert"
    | "summary";

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
    accessibilityRole?: AccessibilityRole;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityState?: AccessibilityState;
    accessibilityValue?: AccessibilityValue;
    accessibilityLiveRegion?: "none" | "polite" | "assertive";
    importantForAccessibility?: "auto" | "yes" | "no" | "no-hide-descendants";
  }

  export interface ViewProps extends AccessibilityProps {
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
    pointerEvents?: "auto" | "none" | "box-none" | "box-only";
    testID?: string;
    ref?: Ref<unknown>;
  }

  export interface TextProps extends AccessibilityProps {
    style?: StyleProp<TextStyle>;
    children?: ReactNode;
    numberOfLines?: number;
    testID?: string;
  }

  export interface PressableStateCallbackType {
    pressed: boolean;
  }

  export interface PressableProps extends AccessibilityProps {
    onPress?: () => void;
    onPressIn?: () => void;
    onPressOut?: () => void;
    onLongPress?: () => void;
    disabled?: boolean;
    hitSlop?: number | Insets;
    testID?: string;
    style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
    children?: ReactNode | ((state: PressableStateCallbackType) => ReactNode);
  }

  export const View: ComponentType<ViewProps>;
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
    }): AnimatedInterpolation;
  }

  export class AnimatedValue implements AnimatedInterpolation {
    constructor(value: number);
    setValue(value: number): void;
    interpolate(config: {
      inputRange: number[];
      outputRange: number[] | string[];
    }): AnimatedInterpolation;
  }

  export interface AnimatedComposite {
    start(callback?: () => void): void;
    stop(): void;
  }

  export const Animated: {
    Value: typeof AnimatedValue;
    View: ComponentType<ViewProps>;
    Text: ComponentType<TextProps>;
    timing(
      value: AnimatedValue,
      config: {
        toValue: number;
        duration: number;
        easing?: (value: number) => number;
        useNativeDriver: boolean;
      },
    ): AnimatedComposite;
  };

  export const Easing: {
    bezier(x1: number, y1: number, x2: number, y2: number): (value: number) => number;
    linear: (value: number) => number;
  };

  export const AccessibilityInfo: {
    isReduceMotionEnabled(): Promise<boolean>;
    addEventListener(
      type: "reduceMotionChanged",
      handler: (enabled: boolean) => void,
    ): { remove(): void };
  };
}
