import { describe, expect, it } from "vitest";
import { requiredNativeFonts, resolveFont, SLANT_DEGREES, tracking } from "./font.js";

describe("weight", () => {
  /**
   * The failure this exists to prevent: `fontFamily: "Quicksand"` with
   * `fontWeight: 700` renders at 400 on Android, because a runtime-registered
   * font has no family to pick a face out of.
   */
  it("is a family name on native and a property on the web", () => {
    expect(resolveFont("native", { role: "display", weight: 700 })).toEqual({
      fontFamily: "Quicksand_700Bold",
    });
    expect(resolveFont("web", { role: "display", weight: 700 })).toMatchObject({
      fontWeight: 700,
    });
  });

  it("never hands native a fontWeight, which it would ignore", () => {
    const resolved = resolveFont("native", { role: "body", weight: 600 });
    expect(resolved).not.toHaveProperty("fontWeight");
  });

  it("keeps the fallback stack on the web and picks one file on native", () => {
    expect(resolveFont("web", { role: "display" }).fontFamily).toBe('"Quicksand", "Comfortaa"');
    expect(resolveFont("web", { role: "mono" }).fontFamily).toContain("monospace");
    expect(resolveFont("native", { role: "mono", weight: 400 }).fontFamily).toBe(
      "JetBrainsMono_400Regular",
    );
  });
});

describe("italic", () => {
  /**
   * Quicksand ships no italic face. The web synthesises an oblique, which is
   * where the screen-title style comes from; Android renders it upright and
   * says nothing, which deletes the most recognisable thing about the type.
   */
  it("is real on the web", () => {
    expect(resolveFont("web", { role: "display", italic: true }).fontStyle).toBe("italic");
  });

  it("falls back to a slant on native when no italic face is registered", () => {
    const resolved = resolveFont("native", { role: "display", italic: true, hasTrueItalic: false });
    expect(resolved.slant).toBe(SLANT_DEGREES);
    expect(resolved.fontStyle).toBeUndefined();
  });

  it("uses the real thing when the app says it loaded one", () => {
    const resolved = resolveFont("native", { role: "display", italic: true, hasTrueItalic: true });
    expect(resolved.fontStyle).toBe("italic");
    expect(resolved.slant).toBeUndefined();
  });
});

describe("tracking", () => {
  /**
   * CSS takes em, React Native takes points. A value written once and used at
   * two sizes is wrong at one of them.
   */
  it("stays em on the web, whatever the size", () => {
    expect(tracking("web", "eyebrow", 10)).toBe("0.14em");
    expect(tracking("web", "eyebrow", 28)).toBe("0.14em");
  });

  it("resolves against the size on native", () => {
    expect(tracking("native", "eyebrow", 10)).toBe(1.4);
    expect(tracking("native", "eyebrow", 28)).toBe(3.92);
    expect(tracking("native", "title", 28)).toBe(-0.56);
  });
});

describe("what Expo has to load", () => {
  it("lists every face, deduplicated, so a missing one is a list and not a surprise", () => {
    const fonts = requiredNativeFonts();
    expect(fonts).toContain("Quicksand_700Bold");
    expect(fonts).toContain("JetBrainsMono_400Regular");
    // display and body are the same family; the list must not say it twice.
    expect(new Set(fonts).size).toBe(fonts.length);
    expect(fonts).toEqual([...fonts].sort());
  });
});
