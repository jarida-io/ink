/**
 * The theme, and the custom properties every rule in `ink.css` reads.
 *
 * Three modes, because the three things a host wants are genuinely different:
 *
 * - **`"scoped"`** (default) writes the variables onto a wrapper element. Safe
 *   in an app that already has its own tokens, and it lets two themes coexist
 *   on one page — a dark preview inside a light settings screen, say.
 * - **`"global"`** writes them onto `<html>`. This is the mode that lets an
 *   existing product adopt the library without touching a stylesheet: the names
 *   emitted are the names its CSS already reads.
 * - **`"context"`** writes nothing. For a product that already applies the
 *   tokens itself — from its own theme store, before React renders, so there is
 *   no flash — and needs this provider only so Ink components can read the
 *   theme. Pass the same theme object the host wrote from; two writers of the
 *   same custom properties is how they drift.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createTheme, type InkTheme, type InkThemeOptions } from "../tokens/theme.js";
import { cssVariables } from "../tokens/css.js";

const ThemeContext = createContext<InkTheme | null>(null);

export type InkProviderMode = "scoped" | "global" | "context";

export interface InkProviderProps extends InkThemeOptions {
  /** Supply a whole theme instead of options, if you build one elsewhere. */
  theme?: InkTheme;
  /** Where the custom properties go, or whether they are written at all. */
  mode?: InkProviderMode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Reads the platform preference, and defaults `animate` from it.
 *
 * Reduced motion never removes the lift — see the note at the foot of
 * `ink.css`. It collapses the transition to one millisecond, so the geometry
 * still tells you the control was pressed.
 */
export function usePrefersReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const initial =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false;

  const [reduced, setReduced] = useState(initial);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setReduced(mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

export function InkProvider({
  theme,
  mode = "scoped",
  className,
  style,
  children,
  ...options
}: InkProviderProps) {
  const reduced = usePrefersReducedMotion();

  const resolved = useMemo(
    () => theme ?? createTheme({ ...options, animate: options.animate ?? !reduced }),
    // The options object is spread fresh each render, so depend on its fields.
    [theme, options.scheme, options.accent, options.density, options.hasTrueItalic, options.animate, reduced],
  );

  const vars = useMemo(() => cssVariables(resolved), [resolved]);

  useEffect(() => {
    if (mode !== "global" || typeof document === "undefined") return;
    const root = document.documentElement;
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
    root.dataset.theme = resolved.scheme;
    root.dataset.density = resolved.density;
    return () => {
      for (const name of Object.keys(vars)) root.style.removeProperty(name);
    };
  }, [mode, vars, resolved.scheme, resolved.density]);

  const body = mode === "scoped" ? (
    <div
      className={["ink", className].filter(Boolean).join(" ")}
      data-theme={resolved.scheme}
      data-density={resolved.density}
      style={{ ...(vars as CSSProperties), ...style }}
    >
      {children}
    </div>
  ) : (
    <>{children}</>
  );

  return <ThemeContext.Provider value={resolved}>{body}</ThemeContext.Provider>;
}

/**
 * The theme, or the default one.
 *
 * It does not throw when there is no provider. A component library that
 * crashes a host application to enforce its own setup step has chosen the
 * wrong failure: the fallback renders correctly in the default theme, and the
 * host notices when the accent is not theirs.
 */
export function useInkTheme(): InkTheme {
  const theme = useContext(ThemeContext);
  return theme ?? DEFAULT_THEME;
}

const DEFAULT_THEME = createTheme();
