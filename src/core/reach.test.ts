import { describe, expect, it } from "vitest";
import { hitSlop, reachBox, reachFor } from "./reach.js";
import { TOUCH } from "../tokens/space.js";

describe("touch the chrome, not the data", () => {
  it("grows a dense control to the floor without growing it visually", () => {
    // 36px pill, 44px floor: 4px above and below.
    expect(reachFor(TOUCH.tapDense)).toEqual({ vertical: 4, horizontal: 0 });
  });

  it("asks for nothing when the control already clears the floor", () => {
    expect(reachFor(TOUCH.tapMin)).toEqual({ vertical: 0, horizontal: 0 });
    expect(reachFor(60).vertical).toBe(0);
    expect(reachBox(TOUCH.tapMin)).toBeNull();
  });

  /**
   * The rule, as an assertion. Growing sideways makes adjacent pills overlap
   * each other's targets, so a tap near a boundary lands on the wrong control —
   * worse than a small target, because it is wrong rather than fiddly.
   */
  it("never grows horizontally, on either platform", () => {
    for (const height of [12, 20, 28, 36, 43]) {
      expect(reachFor(height).horizontal).toBe(0);
      expect(hitSlop(height).left).toBe(0);
      expect(hitSlop(height).right).toBe(0);
    }
  });

  it("hands React Native the same numbers in the shape it wants", () => {
    expect(hitSlop(TOUCH.tapDense)).toEqual({ top: 4, bottom: 4, left: 0, right: 0 });
  });

  it("rounds up rather than landing one pixel short of the floor", () => {
    // An odd shortfall split evenly would leave the target at 43px.
    const slop = hitSlop(35);
    expect(35 + slop.top + slop.bottom).toBeGreaterThanOrEqual(TOUCH.tapMin);
  });
});
