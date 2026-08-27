import { beforeEach, describe, expect, it } from "vitest";
import {
  HOUSE_ICONS,
  normalizeIconName,
  registerIcons,
  registeredIconNames,
  resetIcons,
  resolveIcon,
  suggestIconName,
  subscribeIcons,
  iconsVersion,
} from "./icons.js";
import { configureInk, resetWarnings } from "./env.js";

beforeEach(() => {
  resetIcons();
  resetWarnings();
  configureInk({ dev: true });
});

describe("one name, however it is spelled", () => {
  /**
   * The spellings a developer actually produces. `Search` is what the editor
   * auto-imports, `SearchIcon` is what it auto-imports from a project that
   * enabled the suffixed entry point, `search` is what lucide.dev shows, and
   * `arrowRight` is what someone writes from memory.
   */
  it.each([
    ["Search", "search"],
    ["SearchIcon", "search"],
    ["LucideSearch", "search"],
    ["search", "search"],
    ["  search  ", "search"],
    ["ArrowRight", "arrow-right"],
    ["arrowRight", "arrow-right"],
    ["arrow-right", "arrow-right"],
    ["arrow_right", "arrow-right"],
    ["Arrow Right", "arrow-right"],
    ["ARROW-RIGHT", "arrow-right"],
    ["AArrowDown", "a-arrow-down"],
    ["ALargeSmall", "a-large-small"],
    ["Volume2", "volume-2"],
    ["x", "x"],
    ["X", "x"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeIconName(input)).toBe(expected);
  });

  it("is idempotent, so a key can be normalised twice without moving", () => {
    for (const name of Object.keys(HOUSE_ICONS)) {
      expect(normalizeIconName(normalizeIconName(name))).toBe(normalizeIconName(name));
    }
  });

  it("does not strip an affix down to nothing", () => {
    // "Icon" and "Lucide" are affixes only when something survives removing
    // them. Stripping unconditionally turns a legitimate name into "".
    expect(normalizeIconName("Icon")).toBe("icon");
    expect(normalizeIconName("Lucide")).toBe("lucide");
    expect(normalizeIconName("")).toBe("");
    expect(normalizeIconName("   ")).toBe("");
  });
});

describe("the house set", () => {
  it("resolves with nothing installed and nothing registered", () => {
    // The floor. Every getting-started snippet in the docs renders on a fresh
    // install, without an npm install first.
    expect(resolveIcon("search").status).toBe("ok");
    expect(resolveIcon("chevron-down").status).toBe("ok");
    expect(registeredIconNames()).toHaveLength(Object.keys(HOUSE_ICONS).length);
  });

  it("is drawn on lucide's grid, so a mixture does not show", () => {
    // Every house glyph is a 24x24 drawing using only the two primitives the
    // React Native renderer implements. A path with a `viewBox` of its own, or
    // a `<rect>`, would draw on web and vanish on device.
    const tags = new Set(Object.values(HOUSE_ICONS).flatMap((node) => node.map(([tag]) => tag)));
    expect([...tags].sort()).toEqual(["circle", "path"]);
  });
});

describe("registering a set", () => {
  it("keys a component by the canonical name, whatever it was imported as", () => {
    const Bell = () => null;
    registerIcons({ LucideBellIcon: Bell });
    const resolution = resolveIcon("bell");
    expect(resolution.status).toBe("ok");
    expect(resolution.status === "ok" && resolution.source).toEqual({ component: Bell });
  });

  it("takes data and components in the same call", () => {
    const Bell = () => null;
    registerIcons({ Bell, waves: [["path", { d: "M2 6h20" }]] });
    expect(resolveIcon("bell").status).toBe("ok");
    const waves = resolveIcon("waves");
    expect(waves.status === "ok" && "node" in waves.source).toBe(true);
  });

  it("ignores empty entries rather than registering a hole", () => {
    // A misspelled named import is `undefined`, and storing it would turn a
    // clear "no icon named x" into an icon that resolves and draws nothing.
    registerIcons({ Bell: undefined, Waves: null });
    expect(resolveIcon("bell").status).not.toBe("ok");
  });

  it("notifies subscribers so a late set repaints what is already mounted", () => {
    let seen = 0;
    const stop = subscribeIcons(() => {
      seen += 1;
    });
    const before = iconsVersion();
    registerIcons({ Bell: () => null });
    expect(seen).toBe(1);
    expect(iconsVersion()).toBeGreaterThan(before);
    stop();
    registerIcons({ Waves: () => null });
    expect(seen).toBe(1);
  });
});

describe("names the icon set itself hyphenates two ways", () => {
  /**
   * Lucide exports `ArrowDownAZ` from `arrow-down-a-z` and `Clock12` from
   * `clock-12`. One convention would have to split `AZ` and join `12`, so no
   * single rule reaches both — 32 of lucide's names are in this position.
   *
   * Dropping hyphens for a second lookup reaches all of them, and measured
   * across all 1768 distinct icons lucide publishes it collides with none.
   */
  it("finds an icon registered under either hyphenation", () => {
    const AZ = () => null;
    registerIcons({ ArrowDownAZ: AZ });
    expect(resolveIcon("arrow-down-a-z").status).toBe("ok");
    expect(resolveIcon("arrow-down-az").status).toBe("ok");
    expect(resolveIcon("ArrowDownAZ").status).toBe("ok");
  });

  it("keeps the exact key when there is one, so the loose index never steals", () => {
    const Exact = () => null;
    const Loose = () => null;
    registerIcons({ "clock-12": Exact });
    registerIcons({ Clock12: Loose });
    // Both normalise to "clock-12": the second registration replaces the first
    // rather than living beside it under a second key.
    expect(registeredIconNames().filter((n) => n.startsWith("clock"))).toEqual(["clock-12"]);
  });
});

describe("what happens when a name does not resolve", () => {
  it("distinguishes 'nothing is set up' from 'that name is wrong'", () => {
    // Different causes, different fixes. Collapsing them gives a first-timer
    // spelling advice when what they need is an entry-point snippet.
    expect(resolveIcon("bell").status).toBe("bare");
    registerIcons({ Bell: () => null });
    expect(resolveIcon("wrench").status).toBe("unknown");
  });

  it("suggests the nearest registered name for a typo", () => {
    expect(resolveIcon("serach")).toMatchObject({ status: "unknown", suggestion: "search" });
    expect(resolveIcon("chevrondown")).toMatchObject({ status: "ok", key: "chevron-down" });
  });

  it("suggests nothing for a name that is merely absent", () => {
    // A suggestion that is not close is worse than silence: it sends someone to
    // check a spelling that was never the problem.
    registerIcons({ Bell: () => null });
    expect(suggestIconName("thermometer")).toBeUndefined();
  });

  it("stays cheap against a large registry", () => {
    // The budget exists because this runs during render. Unbudgeted, a single
    // miss is a full edit-distance matrix against every registered name.
    const many: Record<string, unknown> = {};
    for (let i = 0; i < 2000; i += 1) many[`icon-number-${i}`] = () => null;
    registerIcons(many);
    const started = performance.now();
    suggestIconName("completely-unrelated-string");
    expect(performance.now() - started).toBeLessThan(150);
  });
});
