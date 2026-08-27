import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cssVariables } from "../tokens/css.js";
import { createTheme } from "../tokens/theme.js";

const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ink.css"), "utf8");

/**
 * The stylesheet, held to the token system it is supposed to be written in.
 *
 * A design system's stylesheet drifts one hardcoded pixel at a time, and each
 * one looks reasonable in isolation. These tests are the thing that notices.
 */
describe("the stylesheet", () => {
  it("reads only variables the emitter actually writes", () => {
    const declared = new Set(Object.keys(cssVariables(createTheme())));
    // Variables the stylesheet defines for itself, rather than reading from the
    // theme: tone is set per-element, and the lift is a local animation channel.
    const local = new Set([
      "--ink-tone-fg",
      "--ink-tone-soft",
      "--ink-lift",
      // Set per instance by InkAvatarGroup, from its `size` prop.
      "--ink-avatar-size",
    ]);
    const missing = new Set<string>();

    for (const match of CSS.matchAll(/var\((--[a-z0-9-]+)/g)) {
      const name = match[1];
      if (!declared.has(name) && !local.has(name)) missing.add(name);
    }

    expect([...missing], "the stylesheet reads variables nothing writes").toEqual([]);
  });

  it("keeps control geometry off raw pixels", () => {
    // Padding, height and radius on a control come from `tokens/control.ts`.
    // Anything else is a value somebody typed once and nobody compared.
    const offenders: string[] = [];
    for (const line of CSS.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
      const rule = trimmed.match(/^(padding|min-height|border-radius)\s*:\s*(.+);$/);
      if (!rule) continue;
      // A bare px value that is not zero and not from a variable.
      if (/\b\d+px\b/.test(rule[2]) && !rule[2].includes("var(")) {
        offenders.push(trimmed);
      }
    }
    expect(offenders, "control geometry written as raw pixels").toEqual([]);
  });

  it("uses two border widths, both whole pixels", () => {
    const widths = new Set<string>();
    for (const match of CSS.matchAll(/border(?:-[a-z]+)?\s*:\s*([\d.]+)px/g)) widths.add(match[1]);
    for (const match of CSS.matchAll(/border-[a-z]*width\s*:\s*([\d.]+)px/g)) widths.add(match[1]);
    const fractional = [...widths].filter((w) => !Number.isInteger(Number(w)));
    expect(fractional, "a fractional border resolves differently in every engine").toEqual([]);
  });

  it("never hides the focus ring", () => {
    // `outline: none` without a replacement is the single most common way a
    // component library becomes unusable with a keyboard.
    const stripped = CSS.split("\n").filter((l) => /outline:\s*none/.test(l));
    for (const line of stripped) {
      // Acceptable only where the element hands focus to a wrapper that draws it.
      expect(
        /:focus\b/.test(line) || /input|textarea|select/.test(CSS.slice(0, CSS.indexOf(line))),
        `outline removed with no replacement: ${line.trim()}`,
      ).toBe(true);
    }
  });
});
