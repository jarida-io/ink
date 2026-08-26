import { describe, expect, it } from "vitest";
import { cssBlock, cssVariables } from "./css.js";
import { createTheme } from "./theme.js";
import { ACCENTS } from "./color.js";

/**
 * The emitter, on its own terms.
 *
 * A published library cannot assert that it matches a consumer's stylesheet —
 * it has no idea the consumer exists, and a vendored copy of their file would
 * be a snapshot that rots from the day it is taken. The obligation runs the
 * other way: an application adopting these tokens owes itself a drift test, and
 * it is the only side that can see both halves.
 *
 * What stays here is what this package can be held to alone.
 */
describe("the variable set", () => {
  it("names every token a component in this package reads", () => {
    const vars = cssVariables(createTheme());
    const required = [
      "--color-bg", "--color-surface", "--color-text", "--color-text-secondary",
      "--color-accent", "--color-accent-line", "--border-ink", "--shadow-ink",
      "--ink-rest", "--ink-raised", "--ink-pressed", "--ink-press-compact",
      "--ink-border-width", "--ink-hairline-width", "--ink-ease",
      "--focus-ring", "--tap-min", "--tap-dense", "--radius-lg", "--space-4",
      "--font-display", "--font-mono", "--bg-brand-soft",
    ];
    const missing = required.filter((name) => !(name in vars));
    expect(missing, `ink.css reads these and the emitter does not write them`).toEqual([]);
  });

  it("resolves every value, leaving no var() for a cascade to chase", () => {
    // React Native cannot follow a reference, so a token that is one is a token
    // that works on exactly one of the two platforms.
    for (const [scheme, accent] of [["light", "Purple"], ["dark", "Teal"]] as const) {
      const vars = cssVariables(createTheme({ scheme, accent }));
      const unresolved = Object.entries(vars).filter(([, v]) => v.includes("var("));
      expect(unresolved, `${scheme}/${accent} still contains a reference`).toEqual([]);
    }
  });

  it("writes the shadow out of the plate colour rather than repeating a hex", () => {
    // Anything that animates the offset has to write the shadow itself, and a
    // second literal is how the outline and the plate drift to two purples.
    const theme = createTheme();
    expect(cssVariables(theme)["--shadow-ink"]).toBe(
      `${theme.edge.rest}px ${theme.edge.rest}px 0 ${theme.color.ink}`,
    );
  });

  it("carries the accent chain the host theme store would otherwise write", () => {
    const vars = cssVariables(createTheme({ accent: "Coral" }));
    expect(vars["--pp"]).toBe(ACCENTS.Coral[0]);
    expect(vars["--pp-600"]).toBe(ACCENTS.Coral[1]);
    expect(vars["--color-accent"]).toBe(ACCENTS.Coral[0]);
    // The line is derived; the fill is not. Coral is the accent that proves it.
    expect(vars["--color-accent-line"]).not.toBe(ACCENTS.Coral[0]);
  });
});

describe("cssBlock", () => {
  it("writes a stylesheet a build step can paste", () => {
    const block = cssBlock(createTheme({ scheme: "dark" }), ":root[data-theme='dark']");
    expect(block.startsWith(":root[data-theme='dark'] {")).toBe(true);
    expect(block).toContain("--color-bg: #131119;");
    expect(block.trimEnd().endsWith("}")).toBe(true);
  });
});
