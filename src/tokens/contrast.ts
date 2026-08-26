/**
 * The measurement, shipped with the values.
 *
 * Every colour should carry its measurement. But a comment saying "4.6:1 on
 * white" is a promise nothing checks, and it goes stale the first time the hex
 * moves. This module is the same promise as an assertion, so a value that
 * drifts fails a test instead of quietly failing a person.
 *
 * WCAG 2.1 relative luminance and contrast ratio, no dependencies.
 */

/** The floors, named so a failure says which one it fell through. */
export const AA = {
  /** Body copy, and anything under 18px (or under 14px bold). */
  text: 4.5,
  /** Large text: 18px+, or 14px+ bold. */
  largeText: 3,
  /** A focus ring, a control boundary, a meaningful icon. */
  nonText: 3,
} as const;

export type ContrastFloor = keyof typeof AA;

export interface Rgb {
  r: number;
  g: number;
  b: number;
  /** 0..1. Only meaningful for `rgba()` input. */
  a: number;
}

/** Accepts `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(...)` and `rgba(...)`. */
export function parseColor(input: string): Rgb {
  const value = input.trim();

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const expand = (s: string) => parseInt(s.length === 1 ? s + s : s, 16);
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: expand(hex[0]),
        g: expand(hex[1]),
        b: expand(hex[2]),
        a: hex.length === 4 ? expand(hex[3]) / 255 : 1,
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: expand(hex.slice(0, 2)),
        g: expand(hex.slice(2, 4)),
        b: expand(hex.slice(4, 6)),
        a: hex.length === 8 ? expand(hex.slice(6, 8)) / 255 : 1,
      };
    }
    throw new Error(`ink: cannot parse hex colour "${input}"`);
  }

  const fn = value.match(/^rgba?\(([^)]+)\)$/i);
  if (fn) {
    const parts = fn[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) {
      throw new Error(`ink: cannot parse colour "${input}"`);
    }
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }

  throw new Error(`ink: cannot parse colour "${input}"`);
}

/**
 * Flatten a translucent colour onto an opaque one.
 *
 * Every accessibility failure this system has had was an alpha value measured
 * against nothing: `text-secondary` at slate-400 read 2.6:1, the focus ring at
 * 45% purple read 2.06:1. An alpha colour has no ratio until you say what is
 * behind it, so `contrast()` refuses to guess and this is how you tell it.
 */
export function flatten(fg: Rgb, bg: Rgb): Rgb {
  if (fg.a >= 1) return fg;
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminance(color: Rgb): number {
  return (
    0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
  );
}

/** Contrast ratio, 1..21. Translucent foregrounds are flattened onto `bg` first. */
export function contrast(foreground: string, background: string): number {
  const bg = parseColor(background);
  if (bg.a < 1) {
    throw new Error(
      `ink: background "${background}" is translucent — flatten it before measuring`,
    );
  }
  const fg = flatten(parseColor(foreground), bg);
  const lf = luminance(fg);
  const lb = luminance(bg);
  const [hi, lo] = lf > lb ? [lf, lb] : [lb, lf];
  return (hi + 0.05) / (lo + 0.05);
}

/** Rounded to two places, the form a comment should quote. */
export function ratio(foreground: string, background: string): number {
  return Math.round(contrast(foreground, background) * 100) / 100;
}

export function passes(
  foreground: string,
  background: string,
  floor: ContrastFloor = "text",
): boolean {
  return contrast(foreground, background) >= AA[floor];
}

/**
 * Throw with the number rather than a boolean.
 *
 * Used by the token tests, and available to a product that wants to guard a
 * colour it computes at runtime — an accent the user picked, say, which no
 * test in this repository can see.
 */
export function assertContrast(
  foreground: string,
  background: string,
  floor: ContrastFloor,
  label: string,
): void {
  const measured = ratio(foreground, background);
  if (measured < AA[floor]) {
    throw new Error(
      `ink: ${label} measures ${measured}:1 on ${background}, under the ${AA[floor]}:1 ` +
        `required for ${floor}. Darken the foreground or change the ground.`,
    );
  }
}

/**
 * A tint of an opaque colour, as a resolved `rgba()`.
 *
 * The shipped stylesheet writes these as `color-mix(in srgb, var(--pp) 11%,
 * transparent)`. That is the right thing on the web and unavailable everywhere
 * else, so the value is computed once here and both renderers get the same
 * string. `css.test.ts` evaluates the CSS form and asserts they agree.
 */
export function alpha(color: string, amount: number): string {
  const { r, g, b } = parseColor(color);
  const rounded = Math.round(amount * 1000) / 1000;
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${rounded})`;
}

function toHex({ r, g, b }: Pick<Rgb, "r" | "g" | "b">): string {
  const part = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/**
 * The nearest version of a colour that clears a floor on **every** ground it
 * can land on.
 *
 * This exists because of a defect the shipped system still has. `--focus-ring`
 * was split out of `--color-border-focus` precisely because the old ring
 * measured 2.06:1, under the 3:1 WCAG requires of a focus indicator — and then
 * the replacement was measured for purple only. An app whose user picks Coral
 * gets a ring at **2.69:1 on Jarida White**, which is the same defect wearing a
 * different hue. Teal at 3.60:1 is a legitimate ring and an illegal sentence.
 *
 * An accent is chosen at runtime, so no test in any repository can see it. The
 * only durable fix is to stop assuming and start deriving.
 *
 * Taking a *list* of grounds rather than one is not thoroughness for its own
 * sake — it is the bug I wrote on the first attempt. A ring derived against
 * pure white lands at exactly 3.00:1 there and **2.89:1 on the warm page**,
 * because darkening a foreground raises its contrast against white and lowers
 * it against everything darker. The worst ground for a dark foreground is the
 * darkest one, not the lightest, and the only way not to get that backwards
 * again is to check all of them.
 *
 * The walk is a binary search on a straight mix toward black or white, which
 * keeps the hue and gives up only as much chroma as the floor demands.
 */
export function readable(
  color: string,
  grounds: string | string[],
  floor: ContrastFloor = "text",
): string {
  const list = Array.isArray(grounds) ? grounds : [grounds];
  if (list.length === 0) throw new Error("ink: readable() needs at least one ground");

  const clears = (candidate: string) => list.every((g) => contrast(candidate, g) >= AA[floor]);
  if (clears(color)) return color;

  const lightness = list.map((g) => luminance(parseColor(g)));
  const towardBlack = lightness.every((l) => l > 0.35);
  const towardWhite = lightness.every((l) => l <= 0.35);
  if (!towardBlack && !towardWhite) {
    throw new Error(
      "ink: readable() was given both light and dark grounds. No single colour clears " +
        "both directions — derive one value per scheme instead.",
    );
  }

  const start = parseColor(color);
  const target: Rgb = towardBlack ? { r: 0, g: 0, b: 0, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };

  const at = (mix: number): string =>
    toHex({
      r: start.r + (target.r - start.r) * mix,
      g: start.g + (target.g - start.g) * mix,
      b: start.b + (target.b - start.b) * mix,
    });

  let low = 0;
  let high = 1;
  for (let step = 0; step < 24; step += 1) {
    const mid = (low + high) / 2;
    if (clears(at(mid))) high = mid;
    else low = mid;
  }
  return at(high);
}

/**
 * Whichever candidate reads best on a ground.
 *
 * The third of the same family of defects. A flat `#FFFFFF` for text-on-accent
 * is right for Purple (5.70:1) and wrong for Coral: white on `#F97316` measures
 * **2.80:1**, so a filled primary button has a label nobody can read. Charcoal
 * on the same orange is 6.44:1.
 *
 * The accent itself cannot move; it is what the user chose. What can move is
 * what sits on top of it, and there are only ever two sensible candidates.
 */
export function bestOn(candidates: string[], ground: string): string {
  if (candidates.length === 0) throw new Error("ink: bestOn() needs a candidate");
  let best = candidates[0];
  let bestRatio = contrast(best, ground);
  for (const candidate of candidates.slice(1)) {
    const measured = contrast(candidate, ground);
    if (measured > bestRatio) {
      best = candidate;
      bestRatio = measured;
    }
  }
  return best;
}
