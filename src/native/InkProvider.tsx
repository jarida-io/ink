/**
 * The theme, on a platform with no cascade.
 *
 * Everything the web gets from custom properties has to be passed by hand here,
 * so the provider is the only mechanism and `useInkTheme()` is not optional in
 * practice — though, as on the web, it falls back to the default theme rather
 * than throwing. A library that crashes a host to enforce its own setup step
 * has chosen the wrong failure.
 *
 * Reduced motion is read from the platform and folded into `theme.animate`,
 * which the edge respects by collapsing the transition rather than removing the
 * lift. The lift is the pressed state; deleting it leaves a control with no
 * feedback at all.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AccessibilityInfo } from "react-native";
import { createTheme, type InkTheme, type InkThemeOptions } from "../tokens/theme.js";

const ThemeContext = createContext<InkTheme | null>(null);

/** The device's unsafe edges — a notch, a home indicator, a navigation bar. */
export interface InkInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const NO_INSETS: InkInsets = { top: 0, right: 0, bottom: 0, left: 0 };

const InsetsContext = createContext<InkInsets>(NO_INSETS);

const DEFAULT_THEME = createTheme({ hasTrueItalic: false });

export interface InkProviderProps extends InkThemeOptions {
  theme?: InkTheme;
  /**
   * Pass `useSafeAreaInsets()` once, here. React Native cannot measure them
   * itself, and handing them to every sheet, toast and bar is how one of them
   * ends up under the home indicator.
   */
  insets?: Partial<InkInsets>;
  children: ReactNode;
}

export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (live) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  return reduced;
}

export function InkProvider({ theme, insets, children, ...options }: InkProviderProps) {
  const reduced = useReduceMotion();

  const resolved = useMemo(
    () =>
      theme ??
      createTheme({
        ...options,
        // Quicksand ships no italic face, and Expo registers one file per
        // weight. Unless the app has explicitly loaded an italic, the title
        // style has to come from a slant or it silently disappears on Android.
        hasTrueItalic: options.hasTrueItalic ?? false,
        animate: options.animate ?? !reduced,
      }),
    [
      theme,
      options.scheme,
      options.accent,
      options.density,
      options.hasTrueItalic,
      options.animate,
      reduced,
    ],
  );

  // A provider nested to restyle one subtree keeps the edges it was given above;
  // the device did not change shape because a screen chose a darker theme.
  const inherited = useContext(InsetsContext);
  const edges = useMemo<InkInsets>(
    () => (insets ? { ...inherited, ...insets } : inherited),
    [inherited, insets?.top, insets?.right, insets?.bottom, insets?.left],
  );

  return (
    <ThemeContext.Provider value={resolved}>
      <InsetsContext.Provider value={edges}>{children}</InsetsContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useInkInsets(): InkInsets {
  return useContext(InsetsContext);
}

export function useInkTheme(): InkTheme {
  return useContext(ThemeContext) ?? DEFAULT_THEME;
}
