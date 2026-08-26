import { describe, expect, it } from "vitest";
import { BAR_MAX, badgeText, fitBar, shapeFor, type NavDestination } from "./nav.js";

const make = (n: number): NavDestination[] =>
  Array.from({ length: n }, (_, i) => ({ key: `k${i}`, label: `Item ${i}` }));

describe("fitting a bottom bar", () => {
  it("shows everything while it fits", () => {
    const layout = fitBar(make(4), 390);
    expect(layout.shown).toHaveLength(4);
    expect(layout.overflow).toHaveLength(0);
  });

  /**
   * Past the limit the last slot becomes "More" rather than the items being
   * squeezed. Squeezing is how a five-item bar becomes a seven-item bar nobody
   * can hit.
   */
  it("reserves the last slot for overflow rather than squeezing", () => {
    const layout = fitBar(make(8), 390);
    expect(layout.shown).toHaveLength(BAR_MAX - 1);
    expect(layout.overflow).toHaveLength(8 - (BAR_MAX - 1));
    expect(layout.shown.length + 1).toBe(BAR_MAX);
  });

  /**
   * Two different constraints, constantly confused. A bar can be perfectly
   * tappable and still have every label truncated to three characters.
   */
  it("drops labels on label width, not on target width", () => {
    // 390 across five slots is 78pt each: tappable, and wide enough to read.
    expect(fitBar(make(5), 390).iconsOnly).toBe(false);
    // 320 across five is 64pt: still above the 44pt target floor, but a
    // two-word label no longer fits.
    expect(fitBar(make(5), 320).iconsOnly).toBe(true);
    // Fewer destinations means wider slots, so the labels survive further down.
    expect(fitBar(make(3), 320).iconsOnly).toBe(false);
  });

  it("keeps a disabled destination in its slot", () => {
    // Removing it would reshuffle the bar as things become available, which is
    // worse than a control that is visibly unavailable.
    const items = make(4);
    items[1].disabled = true;
    expect(fitBar(items, 390).shown).toHaveLength(4);
  });

  it("does not guess when it has not been measured yet", () => {
    expect(fitBar(make(5), 0).iconsOnly).toBe(false);
  });
});

describe("choosing a shape", () => {
  it("is a bar on a phone, a rail on a tablet, a sidebar on a desktop", () => {
    expect(shapeFor(390)).toBe("bar");
    expect(shapeFor(834)).toBe("rail");
    expect(shapeFor(1440)).toBe("sidebar");
  });

  it("reads the container's width, not the window's", () => {
    // A sidebar inside a split view does not care how wide the phone is, which
    // is why this takes a number rather than reading a media query.
    expect(shapeFor(600)).toBe("bar");
  });
});

describe("badges", () => {
  it("says nothing when there is nothing to say", () => {
    expect(badgeText(0)).toBeNull();
    expect(badgeText(false)).toBeNull();
    expect(badgeText(undefined)).toBeNull();
  });

  it("renders a plain dot for true, and a count otherwise", () => {
    expect(badgeText(true)).toBe("");
    expect(badgeText(7)).toBe("7");
  });

  it("stops counting rather than widening the control", () => {
    expect(badgeText(100)).toBe("99+");
    expect(badgeText(2451)).toBe("99+");
  });
});
