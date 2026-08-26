import { describe, expect, it } from "vitest";
import { glassSurface, minimumTintAlpha } from "./glass.js";
import { createTheme } from "./theme.js";
import { contrast, parseColor } from "./contrast.js";

function over(surface: string, alpha: number, backdrop: string): string {
  const s = parseColor(surface);
  const b = parseColor(backdrop);
  const mix = (x: number, y: number) => Math.round(x * alpha + y * (1 - alpha));
  return `rgb(${mix(s.r, b.r)}, ${mix(s.g, b.g)}, ${mix(s.b, b.b)})`;
}

describe("the tint is derived, not chosen", () => {
  it("stays legible over the two extremes every backdrop lies between", () => {
    for (const scheme of ["light", "dark"] as const) {
      const theme = createTheme({ scheme });
      const glass = glassSurface(theme);
      for (const backdrop of ["#000000", "#FFFFFF"]) {
        const composited = over(theme.color.surface, glass.alpha, backdrop);
        expect(
          contrast(theme.color.text, composited),
          `${scheme} glass on ${backdrop}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  /**
   * The claim that makes the derivation sound, as a test.
   *
   * Blurring averages the backdrop, and an average lies between the extremes —
   * so a floor that holds at black and white holds everywhere in between, at
   * any blur radius, and on a platform that cannot blur at all.
   */
  it("holds for every backdrop between them, which is what makes the blur irrelevant", () => {
    const theme = createTheme();
    const glass = glassSurface(theme);
    for (let step = 0; step <= 20; step += 1) {
      const level = Math.round((step / 20) * 255);
      const backdrop = `rgb(${level}, ${level}, ${level})`;
      const composited = over(theme.color.surface, glass.alpha, backdrop);
      expect(
        contrast(theme.color.text, composited),
        `grey ${level} behind the glass`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("is the LEAST opaque tint that clears the floor, not a round number", () => {
    const theme = createTheme();
    const glass = glassSurface(theme);
    // A hair more transparent must fail, or the derivation is leaving
    // transparency on the table.
    const composited = over(theme.color.surface, glass.alpha - 0.02, "#000000");
    expect(contrast(theme.color.text, composited)).toBeLessThan(4.5);
  });

  it("earns more transparency when the product controls the backdrop", () => {
    const theme = createTheme();
    const anything = glassSurface(theme);
    // Over the app's own two page colours rather than over a photograph.
    const known = glassSurface(theme, { over: [theme.color.bg, theme.color.content] });
    expect(known.alpha).toBeLessThan(anything.alpha);
  });

  it("still looks like a surface when legibility asks for nothing", () => {
    const theme = createTheme();
    // Charcoal on the warm page is already 16:1, so the legibility floor is
    // satisfied at zero opacity — a bar that reads perfectly and cannot be seen.
    const known = glassSurface(theme, { over: [theme.color.bg] });
    expect(known.alpha).toBeGreaterThanOrEqual(0.3);
    expect(glassSurface(theme, { over: [theme.color.bg], minAlpha: 0 }).alpha).toBe(0);
  });

  it("reports the ratio it measured rather than asserting it passed", () => {
    const glass = glassSurface(createTheme());
    expect(glass.worstCase).toBeGreaterThanOrEqual(4.5);
    expect(glass.worstCase).toBeLessThan(6);
  });

  it("says so when the palette is the problem rather than the glass", () => {
    // A surface whose own text fails on it cannot be rescued by opacity.
    expect(() => minimumTintAlpha("#FFFFFF", "#EEEEEE", "text")).toThrow(/Fix the palette/);
  });

  it("keeps a solid fallback for reduced transparency", () => {
    const glass = glassSurface(createTheme());
    expect(glass.solid).toBe(createTheme().color.surface);
  });
});
