import { describe, expect, it } from "vitest";
import { filterItems, highlight, normalise } from "./filter.js";

const items = ["Voice sensitivity", "Settings", "Sessions", "Set up a routine", "Reset"];
const labels = (r: { item: string }[]) => r.map((m) => m.item);

describe("normalising", () => {
  it("folds case and strips accents, so a reader need not type them", () => {
    expect(normalise("Café")).toBe("cafe");
    expect(normalise("JOSÉ")).toBe("jose");
    expect(normalise("Ångström")).toBe("angstrom");
  });
});

describe("ranking", () => {
  /**
   * The reason this is not a plain `includes`. Both match "se"; only one is
   * what the reader is typing, and array order is not an answer.
   */
  it("puts a prefix before a word-start before a mid-word match", () => {
    expect(labels(filterItems(items, "se", (s) => s))).toEqual([
      "Settings",      // starts with
      "Sessions",      // starts with
      "Set up a routine", // starts with
      "Voice sensitivity", // word starts with
      "Reset",         // contains
    ]);
  });

  it("puts an exact match first of all", () => {
    expect(labels(filterItems(items, "Reset", (s) => s))[0]).toBe("Reset");
  });

  it("keeps equal matches in the order they were given", () => {
    // Otherwise the list reshuffles when someone types a character and deletes
    // it again, which reads as the app losing its place.
    const twice = () => labels(filterItems(items, "se", (s) => s));
    expect(twice()).toEqual(twice());
  });

  it("drops what does not match at all", () => {
    expect(filterItems(items, "zzz", (s) => s)).toHaveLength(0);
  });

  it("returns everything, in order, for an empty query", () => {
    expect(labels(filterItems(items, "   ", (s) => s))).toEqual(items);
  });

  it("honours a limit", () => {
    expect(filterItems(items, "se", (s) => s, 2)).toHaveLength(2);
    expect(filterItems(items, "", (s) => s, 3)).toHaveLength(3);
  });

  it("matches across accents in both directions", () => {
    expect(labels(filterItems(["Café Noir"], "cafe", (s) => s))).toEqual(["Café Noir"]);
  });
});

describe("highlighting", () => {
  it("splits the label into matched and unmatched runs", () => {
    const [match] = filterItems(["Settings"], "tti", (s) => s);
    expect(highlight("Settings", match.ranges)).toEqual([
      { text: "Se", match: false },
      { text: "tti", match: true },
      { text: "ngs", match: false },
    ]);
  });

  it("returns the whole label untouched when there is no query", () => {
    expect(highlight("Settings", [])).toEqual([{ text: "Settings", match: false }]);
  });

  it("keeps the original casing and accents, not the normalised form", () => {
    // The reader typed "cafe"; they should still see "Café".
    const [match] = filterItems(["Café"], "cafe", (s) => s);
    expect(highlight("Café", match.ranges).map((p) => p.text).join("")).toBe("Café");
  });
});
