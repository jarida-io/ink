import { describe, expect, it } from "vitest";
import { AA, alpha, contrast, flatten, parseColor, passes, ratio, readable } from "./contrast.js";
import { ACCENTS, DARK, LIGHT, PURPLE, grounds } from "./color.js";
import { createTheme } from "./theme.js";
import { toneColors } from "../core/tone.js";

describe("the maths", () => {
  it("reproduces the ratios DESIGN.md quotes", () => {
    // These four numbers are printed in DESIGN.md's identity table. If the
    // maths here disagreed with them, every assertion below would be measuring
    // something other than what the document claims.
    expect(ratio(LIGHT.text, LIGHT.bg)).toBeCloseTo(17.35, 1);
    expect(ratio(PURPLE[500], LIGHT.bg)).toBeCloseTo(4.42, 1);
    expect(ratio(PURPLE[700], LIGHT.bg)).toBeCloseTo(8.12, 1);
    expect(ratio(LIGHT.textSecondary, LIGHT.bg)).toBeCloseTo(5.97, 1);
  });

  it("refuses to measure against a ground it cannot see", () => {
    // Every accessibility failure this system has had was an alpha value
    // measured against nothing.
    expect(() => contrast("#000", "rgba(255,255,255,0.5)")).toThrow(/translucent/);
  });

  it("flattens a translucent foreground onto its ground first", () => {
    const half = flatten(parseColor("rgba(0,0,0,0.5)"), parseColor("#FFFFFF"));
    expect(half.r).toBeCloseTo(127.5, 1);
    expect(half.a).toBe(1);
  });

  it("parses every form the tokens are written in", () => {
    expect(parseColor("#FFF")).toMatchObject({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor("#171616")).toMatchObject({ r: 23, g: 22, b: 22 });
    expect(parseColor("rgba(23, 22, 22, 0.25)").a).toBe(0.25);
    expect(parseColor("rgb(0 114 245)")).toMatchObject({ r: 0, g: 114, b: 245 });
  });

  it("computes a tint the way color-mix does", () => {
    expect(alpha("#7C3AED", 0.11)).toBe("rgba(124, 58, 237, 0.11)");
  });
});

/**
 * The floors, asserted rather than commented.
 *
 * DESIGN.md calls accessibility "a floor, not a feature" and asks for the
 * measured ratio in the comment beside every colour. A comment is a promise
 * nothing checks; this is the same promise as a build failure.
 */
describe.each([
  ["light", LIGHT],
  ["dark", DARK],
] as const)("%s clears the floor", (_name, p) => {
  it("body text on every ground it lands on", () => {
    for (const ground of [p.bg, p.surface, p.content, p.chrome]) {
      expect(passes(p.text, ground, "text"), `text on ${ground}`).toBe(true);
    }
  });

  it("secondary and tertiary text, which are the ones that have failed before", () => {
    for (const ground of [p.bg, p.surface]) {
      expect(passes(p.textSecondary, ground, "text"), `secondary on ${ground}`).toBe(true);
      expect(passes(p.textTertiary, ground, "text"), `tertiary on ${ground}`).toBe(true);
    }
  });

  it("the focus ring, against the 3:1 a focus indicator needs", () => {
    for (const ground of [p.bg, p.surface, p.chrome]) {
      expect(passes(p.focus, ground, "nonText"), `focus on ${ground}`).toBe(true);
    }
  });

  it("the ink plate, which is the whole signature and must survive the theme", () => {
    // The shipped stylesheet never overrides --border-ink for dark mode, so a
    // #5D23C2 plate lands on a #131119 ground at 1.66:1 — an edge you cannot
    // see. That is the one place this library knowingly diverges; see README.
    expect(passes(p.ink, p.bg, "nonText"), `ink on ${p.bg}`).toBe(true);
    expect(passes(p.ink, p.surface, "nonText"), `ink on ${p.surface}`).toBe(true);
  });

  it("the 2px edge itself", () => {
    expect(passes(p.edge, p.surface, "nonText")).toBe(true);
  });

  it("every semantic foreground on its own soft fill", () => {
    const pairs: [string, string, string][] = [
      ["success", p.successFg, p.successSoft],
      ["warning", p.warningFg, p.warningSoft],
      ["danger", p.dangerFg, p.dangerSoft],
      ["info", p.infoFg, p.infoSoft],
    ];
    for (const [name, fg, soft] of pairs) {
      // A soft fill is translucent, so it has to be flattened onto the surface
      // it will actually sit on before either value means anything.
      const ground = flatten(parseColor(soft), parseColor(p.surface));
      const onGround = `rgb(${Math.round(ground.r)}, ${Math.round(ground.g)}, ${Math.round(ground.b)})`;
      expect(passes(fg, onGround, "text"), `${name} on its own soft fill`).toBe(true);
    }
  });

  it("text on a filled accent", () => {
    expect(passes(p.textOnAccent, p.accent, "text")).toBe(true);
  });

  it("text on the brand paper a stage is filled with", () => {
    expect(passes(p.text, p.brandSoft, "text")).toBe(true);
  });
});

describe("every accent a household can pick", () => {
  it("is an edge and a ring, and never a sentence", () => {
    // DESIGN.md's argument, as an assertion. Jarida Purple is 4.42:1: it clears
    // the 3:1 a UI boundary needs and misses the 4.5:1 body copy needs. The
    // same is true of three of the five running accents — Teal is 3.60:1 and
    // Magenta 4.41:1 on Jarida White — so "an accent is never a sentence" is a
    // rule about all of them, not a quirk of the mark colour.
    expect(passes(PURPLE[500], LIGHT.bg, "text")).toBe(false);
    for (const name of Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]) {
      const theme = createTheme({ accent: name });
      for (const ground of grounds(theme.color)) {
        // The text floor, not the 3:1 for a boundary. A line that only just
        // clears the minimum is gone on a dimmed panel read from across a room.
        expect(
          passes(theme.color.accentLine, ground, "text"),
          `${name} as a line on ${ground}`,
        ).toBe(true);
      }
      for (const scheme of ["light", "dark"] as const) {
        const themed = createTheme({ accent: name, scheme });
        expect(
          passes(themed.color.textOnAccent, themed.color.accent, "text"),
          `label on a filled ${name} button in ${scheme}`,
        ).toBe(true);
      }
    }
  });

  it("leaves the fill alone and derives only the line", () => {
    // The fill is the household's choice and stays exactly what they picked.
    // Only the line moves, and only when it has to.
    const coral = createTheme({ accent: "Coral" });
    expect(coral.color.accent).toBe(ACCENTS.Coral[0]);
    expect(coral.color.accentLine).not.toBe(ACCENTS.Coral[0]);
    const purple = createTheme({ accent: "Purple" });
    expect(purple.color.accentLine).toBe(ACCENTS.Purple[0]);
  });

  it("gets a ring that is derived rather than assumed", () => {
    // Coral is 2.80:1 on a white card — under the 3:1 a focus indicator needs,
    // and exactly the defect `--focus-ring` was split out to fix for purple.
    // The derived ring leaves the accents that already clear untouched.
    const coral = createTheme({ accent: "Coral" });
    expect(coral.color.focus).not.toBe(ACCENTS.Coral[0]);
    const purple = createTheme({ accent: "Purple" });
    expect(purple.color.focus).toBe(ACCENTS.Purple[0]);
  });

  it("gives the brand tone a foreground that can actually be read", () => {
    for (const name of Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]) {
      for (const scheme of ["light", "dark"] as const) {
        const theme = createTheme({ accent: name, scheme });
        const brand = toneColors("brand", theme.color);
        expect(passes(brand.fg, brand.soft, "text"), `${name} badge in ${scheme}`).toBe(true);
      }
    }
  });

  it("keeps its focus ring above the indicator floor on every ground", () => {
    for (const name of Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]) {
      for (const scheme of ["light", "dark"] as const) {
        const theme = createTheme({ accent: name, scheme });
        for (const ground of grounds(theme.color)) {
          expect(
            contrast(theme.color.focus, ground),
            `${name} ring in ${scheme} on ${ground}`,
          ).toBeGreaterThanOrEqual(AA.text);
        }
      }
    }
  });

  it("puts charcoal on the light accents and white on the dark ones", () => {
    // Not a preference. White on Coral is 2.80:1; charcoal on it is 6.44:1.
    expect(createTheme({ accent: "Coral" }).color.textOnAccent).toBe(LIGHT.text);
    expect(createTheme({ accent: "Purple" }).color.textOnAccent).toBe("#FFFFFF");
    // And the answer does not change with the scheme, because the fill does
    // not. Reading it off the scheme's own text colour gave dark mode two light
    // candidates and put white back on Coral at 2.80:1.
    expect(createTheme({ accent: "Coral", scheme: "dark" }).color.textOnAccent).toBe(LIGHT.text);
  });

  it("refuses to derive one colour for two directions", () => {
    expect(() => readable("#F97316", ["#FFFFFF", "#131119"], "nonText")).toThrow(
      /light and dark grounds/,
    );
  });
});
