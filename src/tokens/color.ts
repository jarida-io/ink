/**
 * Colour, and the measurement that justified it.
 *
 * Ported from `pond-desktop/src/styles/design-tokens.css`, which DESIGN.md
 * names as the authority when the shipped system and the brand deck disagree.
 * Every value that carries a contrast argument keeps the argument, because the
 * rule is "every colour carries its measurement" and a value without its
 * reasoning is the thing the next person quietly changes.
 *
 * Ratios below are measured against `light.bg` (#FFF9F9) unless stated, and
 * are re-asserted by `contrast.test.ts` — so if a hex moves, the test tells you
 * which floor it fell through rather than leaving you to notice in a screenshot.
 */

/** Jarida Purple, the canonical mark colour. 4.42:1 on Jarida White. */
export const PURPLE = {
  50: "#F4ECFF",
  100: "#E6D6FF",
  200: "#CFB0FF",
  300: "#B386FF",
  400: "#9D63FF",
  500: "#8C4BFF",
  600: "#7636E6",
  /** The ink line, and the plate under every raised surface. 8.12:1. */
  700: "#5D23C2",
  800: "#421593",
  900: "#2A0C66",
} as const;

/**
 * The five accents a household can choose between.
 *
 * Each is `[base, pressed, soft, softer]`. Note that `Purple.base` is
 * **#7C3AED, not #8C4BFF** — the mark colour and the running UI accent are
 * different values, and the app has always shipped the darker one. It measures
 * 5.47:1 on Jarida White against the mark's 4.42:1, which is why the accent can
 * carry a word and the mark cannot. Keep them distinct; collapsing them either
 * dulls the logo or fails the text.
 */
export const ACCENTS = {
  Purple: ["#7C3AED", "#6D28D9", "#EDE9FE", "#F5F3FF"],
  Blue: ["#2563EB", "#1D4ED8", "#DBEAFE", "#EFF6FF"],
  Teal: ["#0D9488", "#0F766E", "#CCFBF1", "#F0FDFA"],
  Coral: ["#F97316", "#EA580C", "#FFEDD5", "#FFF7ED"],
  Magenta: ["#DB2777", "#BE185D", "#FCE7F3", "#FDF2F8"],
} as const satisfies Record<string, readonly [string, string, string, string]>;

/** Dark keeps base and pressed, and tints the two soft steps instead. */
export const ACCENTS_DARK = {
  Purple: ["#7C3AED", "#6D28D9", "rgba(124, 58, 237, 0.22)", "rgba(124, 58, 237, 0.12)"],
  Blue: ["#2563EB", "#1D4ED8", "rgba(37, 99, 235, 0.22)", "rgba(37, 99, 235, 0.12)"],
  Teal: ["#0D9488", "#0F766E", "rgba(13, 148, 136, 0.22)", "rgba(13, 148, 136, 0.12)"],
  Coral: ["#F97316", "#EA580C", "rgba(249, 115, 22, 0.22)", "rgba(249, 115, 22, 0.12)"],
  Magenta: ["#DB2777", "#BE185D", "rgba(219, 39, 119, 0.22)", "rgba(219, 39, 119, 0.12)"],
} as const satisfies Record<string, readonly [string, string, string, string]>;

export type AccentName = keyof typeof ACCENTS;

export const ACCENT_NAMES = Object.keys(ACCENTS) as AccentName[];

/** Zinc, warmed at the ends. Borders, muted text, quiet fills. */
export const GREY = {
  50: "#FAFAFA",
  100: "#F4F4F5",
  200: "#E4E4E7",
  300: "#D4D4D8",
  400: "#A1A1AA",
  500: "#71717A",
  600: "#52525B",
  700: "#3F3F46",
  800: "#262626",
  /** The brand deck's charcoal. Survives here; the text colour is #171616. */
  900: "#1C1C1C",
} as const;

/**
 * The palette a surface actually reads from.
 *
 * Deliberately flat and fully resolved: no `var()` chains, no `color-mix`, no
 * alpha-over-unknown. React Native has none of those, and the places this
 * system has previously failed accessibility were all alpha composited over a
 * background nobody had checked (`text.secondary` was slate-400 at 2.6:1).
 * A palette of solid values is a palette you can measure.
 */
export interface InkPalette {
  /** The ground. Warm, never neutral. */
  bg: string;
  /** Card faces, inputs, anything holding content. */
  surface: string;
  /** The app shell's slightly cooler content area. */
  content: string;
  /** Navigation and other chrome that must recede. */
  chrome: string;

  text: string;
  /** Meta, captions, provenance. Solid slate, not alpha. */
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  /** What sits on top of a filled accent. */
  textOnAccent: string;

  /** The running accent. Spendable on one control per screen. */
  accent: string;
  /** An 11% tint of the accent. A selected background, never a page. */
  accentSoft: string;
  /** A 6% tint. The quietest possible mark of "this one". */
  accentSofter: string;
  accentPressed: string;
  /**
   * The accent when it is a line rather than a fill.
   *
   * The accent has three jobs and only one of them can be the raw brand value.
   * As a **fill** it is whatever the household chose, and what matters is the
   * label on top of it. As a **line** — a hovered card border, a selected rule,
   * a focus ring — it has to clear 3:1 against the page, and Coral does not:
   * `#F97316` is 2.80:1 on a white card. So the line is derived and the fill
   * is not, and `focus` is the same value under the name it is used by.
   */
  accentLine: string;
  /** `--pp-100`: the brand ramp's tint step, distinct from a tint of the accent. */
  brandTint: string;
  /**
   * A solid brand-tinted paper, not a tint of the accent.
   *
   * The distinction matters: a translucent fill takes the colour of whatever is
   * behind it, which is fine on a card face and wrong on an image, a video
   * frame or a second translucent layer. Anything that has to stay the same
   * colour wherever it lands uses this.
   */
  brandSoft: string;

  /** The ink line and the plate beneath a raised surface. */
  ink: string;
  /** The 2px edge itself. Charcoal, not purple: the plate is the purple. */
  edge: string;

  /** A hairline. Everything unchosen wears this. */
  line: string;
  lineStrong: string;

  hover: string;
  pressed: string;

  /** Focus ring. Its own token because 45% purple measures 2.06:1 as a ring. */
  focus: string;

  success: string;
  successSoft: string;
  successFg: string;
  warning: string;
  warningSoft: string;
  warningFg: string;
  danger: string;
  dangerSoft: string;
  dangerFg: string;
  info: string;
  infoSoft: string;
  infoFg: string;
  neutral: string;
  neutralSoft: string;
}

export const LIGHT: InkPalette = {
  bg: "#FFF9F9",
  surface: "#FFFFFF",
  content: "#FAFAF8",
  chrome: "#F5F4F0",

  text: "#171616",
  // Solid slate-blue, not alpha: alpha over white landed at 4.0:1, under the
  // 4.5:1 AA minimum. Keeps the cooler tone the hub icons were drawn with
  // rather than flattening to plain zinc. 5.97:1.
  textSecondary: "#566178",
  textTertiary: "#566178",
  textDisabled: "rgba(23, 22, 22, 0.25)",
  textOnAccent: "#FFFFFF",

  accent: ACCENTS.Purple[0],
  accentPressed: ACCENTS.Purple[1],
  accentSoft: "rgba(124, 58, 237, 0.11)",
  accentSofter: "rgba(124, 58, 237, 0.06)",
  accentLine: ACCENTS.Purple[0],
  brandTint: ACCENTS.Purple[2],
  brandSoft: ACCENTS.Purple[3],

  ink: PURPLE[700],
  edge: "#171616",

  line: "rgba(23, 22, 22, 0.08)",
  lineStrong: "rgba(23, 22, 22, 0.15)",

  hover: "rgba(23, 22, 22, 0.04)",
  pressed: "rgba(23, 22, 22, 0.08)",

  focus: ACCENTS.Purple[0],

  success: "#34C759",
  successSoft: "rgba(52, 199, 89, 0.12)",
  // Darkened from #0e8a4a, which was 4.4:1 on white and under AA.
  successFg: "#15803D",
  warning: "#FF9500",
  warningSoft: "rgba(255, 149, 0, 0.12)",
  // Darkened from #b08000, which was 3.5:1 on white.
  warningFg: "#92400E",
  danger: "#FF3B30",
  dangerSoft: "rgba(255, 59, 48, 0.10)",
  // #DC2626 alone measured 4.0:1 on some of the soft fills it sits on.
  dangerFg: "#B91C1C",
  info: "#0072F5",
  infoSoft: "rgba(0, 114, 245, 0.05)",
  // Darkened from #4d94d4, which was 3.0:1 on white.
  infoFg: "#0369A1",
  // Darkened from #8E8E93, which was 2.9:1 on white.
  neutral: "#6C6C71",
  neutralSoft: "rgba(142, 142, 147, 0.12)",
};

export const DARK: InkPalette = {
  bg: "#131119",
  surface: "#1E1B26",
  content: "#161320",
  chrome: "#17141F",

  text: "#F3F1F8",
  // Alpha here, unlike light. Over either dark ground it flattens to 5.4:1 and
  // 5.6:1, so it clears AA on both and the shipped value stands.
  textSecondary: "rgba(243, 241, 248, 0.55)",
  // Solid, though: the same 55% over the panel was the tertiary step, and that
  // one landed at 3.3:1.
  textTertiary: "#8B8696",
  textDisabled: "rgba(243, 241, 248, 0.25)",
  textOnAccent: "#FFFFFF",

  accent: ACCENTS_DARK.Purple[0],
  accentPressed: ACCENTS_DARK.Purple[1],
  accentSoft: "rgba(124, 58, 237, 0.11)",
  accentSofter: "rgba(124, 58, 237, 0.06)",
  accentLine: "#B794FF",
  brandTint: ACCENTS_DARK.Purple[2],
  brandSoft: "#241C33",

  // The plate lightens in dark mode. #5D23C2 on the #131119 page is 2.21:1 and
  // on the #1E1B26 panel exactly 2.00:1 — under the 3:1 a UI boundary needs, so
  // the one treatment the system is built around all but disappears. This value
  // is 7.75:1 on the page. It is the single deliberate divergence from the
  // shipped stylesheet; see README and `css.test.ts`.
  ink: "#B794FF",
  edge: "#F3F1F8",

  line: "rgba(243, 241, 248, 0.10)",
  lineStrong: "rgba(243, 241, 248, 0.18)",

  hover: "rgba(243, 241, 248, 0.06)",
  pressed: "rgba(243, 241, 248, 0.10)",

  // #7C3AED on the dark sidebar measures ~3.1:1 — passing, but faint.
  focus: "#B794FF",

  success: "#34C759",
  successSoft: "rgba(52, 199, 89, 0.18)",
  successFg: "#4ADE80",
  warning: "#FF9500",
  warningSoft: "rgba(255, 149, 0, 0.18)",
  warningFg: "#FBBF24",
  danger: "#FF3B30",
  dangerSoft: "rgba(255, 59, 48, 0.15)",
  dangerFg: "#F87171",
  info: "#0072F5",
  infoSoft: "rgba(0, 114, 245, 0.12)",
  infoFg: "#60A5FA",
  // Was inheriting light's #8E8E93 at 4.4:1 on panel, under AA.
  neutral: "#9A9AA0",
  neutralSoft: "rgba(142, 142, 147, 0.12)",
};

/**
 * Every ground a derived colour can land on, in one scheme.
 *
 * `readable()` needs the whole list, not the one someone happened to think of:
 * a ring derived against pure white fails on the warm page four steps darker.
 */
export function grounds(palette: InkPalette): string[] {
  return [palette.bg, palette.surface, palette.content, palette.chrome];
}
