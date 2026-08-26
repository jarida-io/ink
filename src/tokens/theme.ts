/**
 * A theme is one fully-resolved object. Nothing in it is a reference to
 * anything else, because the platform that cannot follow references is the one
 * this library exists to reach.
 */
import {
  ACCENTS,
  ACCENTS_DARK,
  DARK,
  LIGHT,
  grounds,
  type AccentName,
  type InkPalette,
} from "./color.js";
import { EDGE, EDGE_COMPACT, type InkEdgeTokens } from "./edge.js";
import { DURATION, EASE_OUT, type Bezier } from "./motion.js";
import { MEASURE, RADIUS, ROW_HEIGHT, SPACE, TOUCH } from "./space.js";
import { LEADING, SIZE, TRACKING, WEIGHT } from "./type.js";
import { alpha, bestOn, readable } from "./contrast.js";

export type InkScheme = "light" | "dark";

/**
 * The only two things that ever sit on a filled accent.
 *
 * Jarida Charcoal and white, in both schemes, because the accent fill itself is
 * scheme-independent.
 */
const INK_ON_ACCENT_DARK = "#171616";
const INK_ON_ACCENT_LIGHT = "#FFFFFF";

/**
 * Comfortable is the default and the one both surfaces were designed at.
 * Compact removes a step of vertical padding and nothing else — it must never
 * take a control below the touch floor, which is why it scales spacing and not
 * `TOUCH`.
 */
export type InkDensity = "comfortable" | "compact";

export interface InkTheme {
  scheme: InkScheme;
  accent: AccentName;
  density: InkDensity;
  color: InkPalette;
  edge: InkEdgeTokens;
  edgeCompact: InkEdgeTokens;
  space: typeof SPACE;
  radius: typeof RADIUS;
  touch: typeof TOUCH;
  rowHeight: typeof ROW_HEIGHT;
  measure: typeof MEASURE;
  size: typeof SIZE;
  weight: typeof WEIGHT;
  leading: typeof LEADING;
  tracking: typeof TRACKING;
  duration: typeof DURATION;
  easing: Bezier;
  /**
   * Whether the display face has a real italic on this platform. False makes
   * `InkTitle` fall back to a slant transform rather than silently render
   * upright, which is what Android does with a synthesised italic on a custom
   * family. See `core/font.ts`.
   */
  hasTrueItalic: boolean;
  /** Set false to honour a reduced-motion preference. Geometry still changes. */
  animate: boolean;
}

export interface InkThemeOptions {
  scheme?: InkScheme;
  accent?: AccentName;
  density?: InkDensity;
  hasTrueItalic?: boolean;
  animate?: boolean;
}

export function createTheme(options: InkThemeOptions = {}): InkTheme {
  const scheme = options.scheme ?? "light";
  const accent = options.accent ?? "Purple";
  const base: InkPalette = scheme === "dark" ? DARK : LIGHT;
  const ramp = scheme === "dark" ? ACCENTS_DARK[accent] : ACCENTS[accent];
  // The line clears the **text** floor, not the 3:1 WCAG asks of a UI boundary.
  //
  // Deriving to 3:1 exactly is what the first version of this did, and it threw
  // away a judgment the product had already made and written down: the shipped
  // dark theme lifts its focus ring off the accent with the note "#7C3AED on
  // the dark sidebar measures ~3.1:1, which passes but reads faint". Landing on
  // 3.00 reproduced precisely the faintness that comment was complaining about.
  //
  // DESIGN.md gives the reason it matters more here than in most products:
  // important UI lines have to stay visible on a dimmed 800x480 panel read from
  // across a room, which is also why the edge is 2px rather than a hairline. A
  // boundary that only just clears the minimum on a bright monitor is a
  // boundary that is gone on that screen.
  //
  // Purple in light measures 5.18:1 on the warm sidebar and is returned
  // untouched, so the default theme is unchanged.
  const line = readable(ramp[0], grounds(base), "text");

  return {
    scheme,
    accent,
    density: options.density ?? "comfortable",
    color: {
      ...base,
      accent: ramp[0],
      accentPressed: ramp[1],
      // Computed rather than taken from the ramp, and the same percentages in
      // both schemes. The ramp's soft steps are brand papers with their own
      // dark values; these two are tints of whatever accent is running, and the
      // shipped stylesheet applies them at 11% and 6% regardless of theme.
      accentSoft: alpha(ramp[0], 0.11),
      accentSofter: alpha(ramp[0], 0.06),
      brandTint: ramp[2],
      brandSoft: scheme === "dark" ? base.brandSoft : ramp[3],
      // The ring is derived, not assumed.
      //
      // It used to be "the accent", which is correct for Purple (5.70:1 on a
      // white card) and wrong for Coral (2.80:1) — under the 3:1 WCAG requires
      // of a focus indicator, and the exact defect the ring token was split out
      // to fix in the first place. `readable` returns the accent untouched when
      // it already clears, and walks it toward the nearest extreme when it does
      // not, so an accent nobody has written down yet is still safe.
      //
      // Derived against every ground a line can land on, because the worst one
      // is the darkest page and not the whitest card — see `readable()`.
      accentLine: line,
      focus: line,
      // Not a constant white. White on Coral is 2.80:1 — an unreadable label on
      // the one control that is asking a question. Charcoal on the same orange
      // is 6.44:1, and on Purple white wins the other way, 5.70 against 3.17.
      //
      // The candidates are fixed rather than taken from `base.text`, and that
      // is the whole point: in dark mode the scheme's text colour is already
      // near-white, so `[base.text, "#FFFFFF"]` offers two light candidates and
      // hands a light accent an unreadable label. The fill does not change
      // between schemes — Coral is #F97316 in both — so neither should what
      // sits on it.
      textOnAccent: bestOn([INK_ON_ACCENT_DARK, INK_ON_ACCENT_LIGHT], ramp[0]),
    },
    edge: EDGE,
    edgeCompact: EDGE_COMPACT,
    space: SPACE,
    radius: RADIUS,
    touch: TOUCH,
    rowHeight: ROW_HEIGHT,
    measure: MEASURE,
    size: SIZE,
    weight: WEIGHT,
    leading: LEADING,
    tracking: TRACKING,
    duration: DURATION,
    easing: EASE_OUT,
    hasTrueItalic: options.hasTrueItalic ?? true,
    animate: options.animate ?? true,
  };
}

/** Vertical padding multiplier. Never applied to anything in `TOUCH`. */
export function densityScale(density: InkDensity): number {
  return density === "compact" ? 0.75 : 1;
}
