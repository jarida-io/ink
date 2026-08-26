/**
 * Glass — a second material, for chrome only.
 *
 * ## Why a design system built on printed paper has a glass in it
 *
 * The rule is that **the edge marks content, never chrome**. Cards wear the 2px
 * border and the hard plate because they are what the screen is for; toolbars,
 * filters and navigation stay quiet, or nothing on the page is loud any more.
 *
 * That leaves an open question the ink material never answered: what *is* a
 * navigation bar made of? A flat opaque strip works until content scrolls
 * beneath it, at which point it is a lid rather than a layer. Apple's answer in
 * Liquid Glass is a material that refracts what is behind it so you keep your
 * sense of place while the bar stays legible. That is the right instinct for
 * chrome, and it does not compete with the edge because it is not trying to say
 * *this is important* — it is trying to say *this is above*.
 *
 * So glass is admitted, on three conditions, and this file is those conditions.
 *
 * ## 1. The tint is derived, not chosen
 *
 * The standing criticism of Liquid Glass is that contrast falls below AA over a
 * busy backdrop. It is a fair criticism and it is a solvable one: a glass panel
 * is `alpha` of its own surface over an unknown backdrop, and there is a
 * *minimum alpha* at which its label clears 4.5:1 no matter what is behind it.
 * That number is computable, so it is computed. `glassSurface()` returns the
 * least opaque glass that is still legible, and reports the ratio it measured
 * at the worst case.
 *
 * On the light theme that lands near 0.49 — noticeably more opaque than the
 * glass in a marketing shot. That is not this library being timid; it is what
 * "legible over anything" actually costs, and the honest thing is to show the
 * number rather than the shot.
 *
 * ## 2. The guarantee does not depend on the blur
 *
 * Worth stating, because it is what makes the derivation sound. Blurring the
 * backdrop averages it, and an average can only lie *between* the extremes the
 * derivation already bounded — black and white. So the floor holds whatever the
 * blur radius is, whatever is behind, and on a platform that cannot blur at all.
 * The blur is a look; the alpha is the contract.
 *
 * ## 3. It degrades to paper
 *
 * `prefers-reduced-transparency` and the platform's Reduce Transparency setting
 * turn the glass into a solid surface. Nothing is lost but the effect, because
 * the tint was already carrying the legibility.
 */
import { contrast, parseColor, type ContrastFloor, AA } from "./contrast.js";
import type { InkTheme } from "./theme.js";

export interface GlassSurface {
  /** `rgba(...)` — the tint, at the least opacity that stays legible. */
  background: string;
  /** The derived alpha, 0..1. Exposed so a caller can reason about it. */
  alpha: number;
  /** Backdrop blur radius in px. A look, not a guarantee. */
  blur: number;
  /** Backdrop saturation multiplier. Glass carries colour from behind it. */
  saturate: number;
  /** The rim highlight — the specular edge, at the top. */
  rim: string;
  /** The rim shade, at the bottom, so the bar reads as a solid piece. */
  rimShade: string;
  /** The measured ratio at the worst backdrop. Never below the floor. */
  worstCase: number;
  /** What the glass becomes when transparency is reduced. */
  solid: string;
}

/**
 * The extremes any backdrop lies between.
 *
 * Luminance is monotonic in each channel, so a composite over *any* colour sits
 * between the composite over black and the composite over white. Checking two
 * colours therefore checks all of them.
 */
const BACKDROP_EXTREMES = ["#000000", "#FFFFFF"];

function composite(surface: string, alpha: number, backdrop: string): string {
  const s = parseColor(surface);
  const b = parseColor(backdrop);
  const mix = (a: number, c: number) => Math.round(a * alpha + c * (1 - alpha));
  return `rgb(${mix(s.r, b.r)}, ${mix(s.g, b.g)}, ${mix(s.b, b.b)})`;
}

/**
 * The least opaque tint whose label still clears the floor over any backdrop.
 *
 * Binary search rather than algebra: the relationship runs through an sRGB
 * transfer curve and a piecewise contrast ratio, and twenty-four iterations of
 * something obviously correct beats a closed form nobody can check.
 */
export function minimumTintAlpha(
  surface: string,
  text: string,
  floor: ContrastFloor = "text",
  backdrops: string[] = BACKDROP_EXTREMES,
): number {
  const clears = (alpha: number) =>
    backdrops.every((b) => contrast(text, composite(surface, alpha, b)) >= AA[floor]);

  if (clears(0)) return 0;
  if (!clears(1)) {
    // The surface itself fails against its own text, which is a palette bug
    // rather than a glass one — no amount of opacity rescues it.
    throw new Error(
      `ink: ${text} does not clear ${AA[floor]}:1 on ${surface} even at full opacity. ` +
        `Fix the palette; glass cannot.`,
    );
  }

  let low = 0;
  let high = 1;
  for (let step = 0; step < 24; step += 1) {
    const mid = (low + high) / 2;
    if (clears(mid)) high = mid;
    else low = mid;
  }
  return Math.ceil(high * 1000) / 1000;
}

export interface GlassOptions {
  /**
   * Restrict the backdrop, and the glass gets to be more transparent.
   *
   * Pass the actual colours that can appear behind the bar when the product
   * controls them — a page background, say. Leave it out and the derivation
   * assumes anything, which is what a photograph or a video frame requires.
   */
  over?: string[];
  /** Blur radius. Look only; the legibility floor does not depend on it. */
  blur?: number;
  floor?: ContrastFloor;
  /**
   * The point below which glass stops reading as a surface at all.
   *
   * A separate floor from the legibility one, and it has to be: over the app's
   * own warm page, charcoal already measures 16:1, so the derivation correctly
   * returns an alpha of zero — a bar that is perfectly legible and completely
   * invisible. Legibility says how opaque it must be; this says how opaque it
   * must be to look like a layer.
   */
  minAlpha?: number;
}

export function glassSurface(theme: InkTheme, options: GlassOptions = {}): GlassSurface {
  const surface = theme.color.surface;
  const required = minimumTintAlpha(
    surface,
    theme.color.text,
    options.floor ?? "text",
    options.over ?? BACKDROP_EXTREMES,
  );
  const alpha = Math.max(required, options.minAlpha ?? 0.3);
  const { r, g, b } = parseColor(surface);

  const worst = Math.min(
    ...(options.over ?? BACKDROP_EXTREMES).map((backdrop) =>
      contrast(theme.color.text, composite(surface, alpha, backdrop)),
    ),
  );

  const light = theme.scheme === "light";

  return {
    background: `rgba(${r}, ${g}, ${b}, ${alpha})`,
    alpha,
    blur: options.blur ?? 20,
    // Glass carries the colour of what is behind it. Above about 1.8 it stops
    // reading as glass and starts reading as a filter.
    saturate: 1.6,
    // The specular edge. One hairline at the top, catching the light, and a
    // darker one at the bottom so the bar reads as a piece with thickness
    // rather than a rectangle of fog.
    rim: light ? "rgba(255, 255, 255, 0.65)" : "rgba(255, 255, 255, 0.14)",
    rimShade: light ? "rgba(23, 22, 22, 0.06)" : "rgba(0, 0, 0, 0.28)",
    worstCase: Math.round(worst * 100) / 100,
    solid: surface,
  };
}
