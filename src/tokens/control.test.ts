import { describe, expect, it } from "vitest";
import {
  BORDER,
  CONTAINER_PAD,
  CONTROL_HEIGHT,
  controlMetrics,
  controlPadX,
  controlPadY,
} from "./control.js";
import { SPACE, TOUCH } from "./space.js";

describe("control geometry is derived", () => {
  it("keeps side padding on the 4px grid at every size", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      expect(controlPadX(size) % 4, `${size} padX`).toBe(0);
      expect(controlPadY(size) % 4, `${size} padY`).toBe(0);
    }
  });

  it("lands on the values the scale already wanted", () => {
    // 32 -> 12, 44 -> 16, 52 -> 20. If the ratio moves, these move with it, and
    // that is the point: one number to change instead of five.
    expect(controlPadX("sm")).toBe(SPACE[3]);
    expect(controlPadX("md")).toBe(SPACE[4]);
    expect(controlPadX("lg")).toBe(SPACE[5]);
  });

  it("gives a pill one step more, because its corner eats side room", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      expect(controlPadX(size, "pill")).toBe(controlPadX(size) + 4);
    }
  });

  it("keeps vertical padding below horizontal, so a tile is not a square", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      expect(controlPadY(size)).toBeLessThan(controlPadX(size));
      expect(controlPadY(size)).toBeGreaterThan(0);
    }
  });

  it("defaults to the touch floor rather than to something that needs excusing", () => {
    expect(CONTROL_HEIGHT.md).toBe(TOUCH.tapMin);
    expect(controlMetrics().height).toBe(TOUCH.tapMin);
  });

  it("gives a small control a small corner", () => {
    expect(controlMetrics("sm").radius).toBeLessThan(controlMetrics("md").radius);
    expect(controlMetrics("md", "pill").radius).toBeGreaterThan(100);
  });

  it("keeps container padding on its own scale, not the control's", () => {
    // A container's padding is the space around a group; a control's is the
    // space around a word. Tying them makes cards tight where controls are right.
    expect(CONTAINER_PAD.lg).toBeGreaterThan(controlPadX("lg"));
  });
});

describe("borders", () => {
  /**
   * The 1.5px hairline is gone, and its absence is the point: a fractional
   * pixel resolves differently in every engine at 1x, so it is the one value in
   * a design system that is not the same on two machines.
   */
  it("are whole device pixels, so they are identical in every engine", () => {
    for (const width of Object.values(BORDER)) {
      expect(Number.isInteger(width), `${width} is fractional`).toBe(true);
    }
  });

  it("are two, each with a job", () => {
    expect(Object.keys(BORDER)).toEqual(["hairline", "ink"]);
    expect(BORDER.ink).toBeGreaterThan(BORDER.hairline);
  });
});
