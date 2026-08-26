/**
 * Type — and the two places React Native silently drops the house style.
 *
 * ## 1. Weight is not a property of a custom font on Android
 *
 * On the web, `font-family: Quicksand; font-weight: 700` works because the
 * browser picks the 700 face out of the family. React Native on Android has no
 * family concept for fonts loaded at runtime: it looks up one file by the exact
 * name you registered, and `fontWeight` is ignored. `Quicksand` at weight 700
 * renders at 400 and nobody notices until the build is on a device.
 *
 * So a font is never a family plus a weight here. It is a *role* plus a
 * *weight*, resolved by `resolveFont()` in `core/font.ts` into whichever of the
 * two shapes the platform needs.
 *
 * ## 2. Letter-spacing is em on the web and points on native
 *
 * `letter-spacing: 0.14em` on a 10px eyebrow is 1.4px. On a 28px title,
 * `-0.02em` is -0.56px. React Native takes only the absolute number, so any
 * tracking value written once and used at two sizes is wrong at one of them.
 * Tracking is therefore stored in em and converted by `tracking()` against the
 * size it is actually being used at.
 */

/** The three roles. Everything on a screen is one of these. */
export type FontRole = "display" | "body" | "mono";

export type FontWeight = 400 | 500 | 600 | 700;

/**
 * Quicksand leads, Comfortaa is its declared fallback, JetBrains Mono carries
 * anything that is data — numbers, timestamps, paths, measurements, sizes.
 */
export const FONT_STACKS: Record<FontRole, string[]> = {
  display: ["Quicksand", "Comfortaa"],
  body: ["Quicksand", "Comfortaa"],
  mono: ["JetBrains Mono", "ui-monospace", "SF Mono", "Menlo", "Consolas", "monospace"],
};

/**
 * The stacks as CSS writes them, character for character.
 *
 * Not derived from `FONT_STACKS` by a quoting rule, because there is no rule to
 * derive: the shipped stylesheet quotes `"Quicksand"` and leaves `Menlo` bare,
 * and any function that reproduces that is a function encoding one file's
 * habits. Writing the strings out means `css.test.ts` can compare them to the
 * stylesheet directly and a mismatch is a mismatch rather than a quoting
 * argument.
 */
export const WEB_FONT_STACKS: Record<FontRole, string> = {
  display: '"Quicksand", "Comfortaa"',
  body: '"Quicksand", "Comfortaa"',
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};

/**
 * The per-weight file names Expo registers, which are also the names
 * `@expo-google-fonts/*` exports. `resolveFont()` reads this on native and
 * ignores it on the web.
 */
export const NATIVE_FONT_FILES: Record<FontRole, Record<FontWeight, string>> = {
  display: {
    400: "Quicksand_400Regular",
    500: "Quicksand_500Medium",
    600: "Quicksand_600SemiBold",
    700: "Quicksand_700Bold",
  },
  body: {
    400: "Quicksand_400Regular",
    500: "Quicksand_500Medium",
    600: "Quicksand_600SemiBold",
    700: "Quicksand_700Bold",
  },
  mono: {
    400: "JetBrainsMono_400Regular",
    500: "JetBrainsMono_500Medium",
    600: "JetBrainsMono_600SemiBold",
    700: "JetBrainsMono_700Bold",
  },
};

/** Sizes in px. Small, because both surfaces are read at arm's length or further. */
export const SIZE = {
  xs: 10,
  sm: 12,
  base: 13,
  md: 15,
  lg: 18,
  xl: 22,
  "2xl": 28,
  "3xl": 36,
} as const;

export type SizeName = keyof typeof SIZE;

export const WEIGHT = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const satisfies Record<string, FontWeight>;

export const LEADING = {
  tight: 1.15,
  snug: 1.25,
  base: 1.5,
  loose: 1.7,
} as const;

/**
 * Tracking, in em, so it can be resolved against the size it is used at.
 *
 * `eyebrow` is the widest thing in the system and it is deliberate: the mono
 * micro-label set at 0.14em is what lets a field group separate itself without
 * a rule or a box.
 */
export const TRACKING = {
  title: -0.02,
  tight: -0.015,
  snug: -0.01,
  none: 0,
  wide: 0.06,
  eyebrow: 0.14,
} as const;

export type TrackingName = keyof typeof TRACKING;

/**
 * The screen title, stated once.
 *
 * Bold italic at -0.02em is the single most recognisable thing about this
 * typography, and it is why a settings page reads as something built for a
 * house rather than a server rack. It is also the thing most likely to be lost
 * in a port: Quicksand ships no italic face, so the web synthesises an oblique
 * and Android renders it upright. `core/font.ts` handles that; see
 * `InkTitle` on each platform.
 */
export const TITLE = {
  size: SIZE["2xl"],
  weight: WEIGHT.bold,
  italic: true,
  tracking: TRACKING.title,
  leading: LEADING.tight,
} as const;
