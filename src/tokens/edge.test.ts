import { describe, expect, it } from "vitest";
import { EDGE, EDGE_COMPACT, edgeOffset, faceShift, type InkState } from "./edge.js";
import { edgeStateFor, edgeInset, plateRadius, resolveEdge } from "../core/edge.js";
import { RADIUS } from "./space.js";

const STATES: InkState[] = ["rest", "raised", "pressed"];

describe("the plate never moves", () => {
  /**
   * The claim the whole port rests on. If it were false, the native renderer
   * could not draw the edge with a static view, and the two platforms would
   * need two different mechanics for the same signature.
   */
  it("sits at the same absolute position in all three states", () => {
    const positions = STATES.map((state) => {
      const { shift, offset } = resolveEdge(state);
      // The plate is drawn relative to the face, and the face has moved by
      // `shift`. Its absolute position is therefore the sum.
      return shift + offset;
    });
    expect(new Set(positions).size).toBe(1);
    expect(positions[0]).toBe(EDGE.rest);
  });

  it("holds for the compact ladder too", () => {
    const positions = STATES.map((state) => {
      const { shift, offset } = resolveEdge(state, EDGE_COMPACT);
      return shift + offset;
    });
    expect(new Set(positions).size).toBe(1);
  });
});

describe("the ladder", () => {
  it("rests at 4, lifts to 7 and presses to 0", () => {
    expect(edgeOffset("rest")).toBe(4);
    expect(edgeOffset("raised")).toBe(7);
    expect(edgeOffset("pressed")).toBe(0);
  });

  it("moves the face by exactly what the offset lost", () => {
    // Pressing lands the face in the space its own plate was occupying, which
    // is what makes it read as a key being struck.
    expect(faceShift("pressed")).toBe(EDGE.rest);
    expect(faceShift("rest")).toBe(0);
    expect(faceShift("raised")).toBe(-3);
  });

  it("gives a small control a shorter throw", () => {
    // A 30px chip travelling the full 4px reads as falling over.
    expect(faceShift("pressed", EDGE_COMPACT)).toBe(2);
  });
});

describe("the rung a platform can actually reach", () => {
  it("never raises on touch, because a finger has no hover", () => {
    expect(edgeStateFor("native", { hovered: true })).toBe("rest");
    expect(edgeStateFor("web", { hovered: true })).toBe("raised");
  });

  it("lets a press win over a hover on both", () => {
    expect(edgeStateFor("web", { hovered: true, pressed: true })).toBe("pressed");
    expect(edgeStateFor("native", { pressed: true })).toBe("pressed");
  });

  /**
   * The native construction only stays inside its own bounds while the face
   * moves down-and-right. `raised` is the one rung that moves it up-and-left,
   * which on Android would clip — so the guarantee above is not a nicety, it is
   * what keeps the plate geometry safe.
   */
  it("keeps the face inside the box it was given, on native", () => {
    for (const flags of [{}, { pressed: true }, { hovered: true }, { hovered: true, pressed: true }]) {
      expect(faceShift(edgeStateFor("native", flags))).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("plate radius", () => {
  it("grows by the offset so the two curves stay concentric", () => {
    // Matching radii leaves a crescent of plate poking past the face's corner.
    expect(plateRadius(RADIUS.lg, 4)).toBe(RADIUS.lg + 4);
  });

  it("leaves a pill a pill", () => {
    expect(plateRadius(RADIUS.pill, 4)).toBe(RADIUS.pill);
  });
});

describe("what the edge costs in layout", () => {
  it("is the rest offset, which is what native reserves", () => {
    expect(edgeInset()).toBe(EDGE.rest);
  });
});
