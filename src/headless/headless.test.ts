import { describe, expect, it, vi } from "vitest";
import { isRovingKey, rove } from "./roving.js";
import { ToastQueue, readingTime } from "./toast.js";
import { stepFor, thumbOffset, valueAt, type SliderScale } from "./slider.js";

describe("roving focus", () => {
  it("moves, wraps and reaches the ends", () => {
    expect(rove("ArrowRight", 0, 3)).toBe(1);
    expect(rove("ArrowRight", 2, 3)).toBe(0);
    expect(rove("ArrowLeft", 0, 3)).toBe(2);
    expect(rove("Home", 2, 3)).toBe(0);
    expect(rove("End", 0, 3)).toBe(2);
  });

  it("skips what cannot be reached rather than focusing and refusing", () => {
    const disabled = [false, true, false];
    expect(rove("ArrowRight", 0, 3, { disabled })).toBe(2);
    expect(rove("Home", 2, 3, { disabled: [true, false, false] })).toBe(1);
  });

  it("stops at the ends when wrapping is off", () => {
    expect(rove("ArrowRight", 2, 3, { wrap: false })).toBeNull();
    expect(rove("ArrowLeft", 0, 3, { wrap: false })).toBeNull();
  });

  it("gives up rather than looping when everything is disabled", () => {
    expect(rove("ArrowRight", 0, 3, { disabled: [true, true, true] })).toBeNull();
  });

  it("honours orientation, so a vertical list ignores left and right", () => {
    expect(rove("ArrowRight", 0, 3, { orientation: "vertical" })).toBeNull();
    expect(rove("ArrowDown", 0, 3, { orientation: "vertical" })).toBe(1);
    expect(isRovingKey("ArrowDown", "horizontal")).toBe(false);
  });

  it("returns null for a key it does not own, so the host can let it through", () => {
    expect(rove("Tab", 0, 3)).toBeNull();
    expect(rove("a", 0, 3)).toBeNull();
  });
});

describe("the toast queue", () => {
  it("scales a message's life to how long it takes to read", () => {
    expect(readingTime("Saved")).toBeLessThan(
      readingTime("The engine could not start, so the previous voice is still running."),
    );
    expect(readingTime("Saved")).toBeGreaterThanOrEqual(3000);
    expect(readingTime("word ".repeat(500))).toBeLessThanOrEqual(12_000);
  });

  it("never takes a failure away on a timer", () => {
    // The text of a danger message is the instructions. Removing it removes the
    // only thing that would let someone act.
    const schedule = vi.fn();
    const queue = new ToastQueue({ schedule });
    queue.show({ text: "Could not save", tone: "danger" });
    expect(schedule).not.toHaveBeenCalled();
    queue.show({ text: "Saved" });
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it("dismisses on the host's clock, not its own", () => {
    let fire: (() => void) | null = null;
    const queue = new ToastQueue({ schedule: (fn) => { fire = fn; } });
    queue.show({ text: "Saved" });
    expect(queue.all()).toHaveLength(1);
    fire!();
    expect(queue.all()).toHaveLength(0);
  });

  it("keeps the newest when the screen is full", () => {
    const queue = new ToastQueue({ schedule: () => {}, max: 2 });
    queue.show({ text: "one" });
    queue.show({ text: "two" });
    queue.show({ text: "three" });
    expect(queue.all().map((t) => t.text)).toEqual(["two", "three"]);
  });

  it("notifies subscribers on every change", () => {
    const queue = new ToastQueue({ schedule: () => {} });
    const seen: number[] = [];
    queue.subscribe((items) => seen.push(items.length));
    const id = queue.show({ text: "one" });
    queue.dismiss(id);
    queue.dismiss(id);
    expect(seen).toEqual([1, 0]);
  });
});

describe("slider maths", () => {
  const scale: SliderScale = { min: 0, max: 100, step: 1, length: 220, thumb: 20 };

  /**
   * The mistake this exists to prevent: measuring from the thumb's edge rather
   * than its centre reaches the maximum half a thumb before the end of the
   * track, and it looks almost right.
   */
  it("reaches both ends exactly where the thumb does", () => {
    expect(valueAt(scale.thumb / 2, scale)).toBe(0);
    expect(valueAt(scale.length - scale.thumb / 2, scale)).toBe(100);
    expect(thumbOffset(0, scale)).toBe(0);
    expect(thumbOffset(100, scale)).toBe(scale.length - scale.thumb);
  });

  it("is its own inverse at the midpoint", () => {
    const mid = thumbOffset(50, scale) + scale.thumb / 2;
    expect(valueAt(mid, scale)).toBe(50);
  });

  it("clamps a pointer that leaves the track", () => {
    expect(valueAt(-500, scale)).toBe(0);
    expect(valueAt(9999, scale)).toBe(100);
  });

  it("snaps without leaving float dust in the readout", () => {
    const fine: SliderScale = { min: 0.5, max: 2, step: 0.1, length: 200, thumb: 20 };
    for (let x = 0; x <= fine.length; x += 7) {
      const value = valueAt(x, fine);
      expect(String(value).replace("-", "").split(".")[1]?.length ?? 0).toBeLessThanOrEqual(1);
    }
  });

  it("steps from the keyboard, coarsely on Page keys", () => {
    expect(stepFor("ArrowRight", 50, scale)).toBe(51);
    expect(stepFor("PageUp", 50, scale)).toBe(60);
    expect(stepFor("Home", 50, scale)).toBe(0);
    expect(stepFor("End", 50, scale)).toBe(100);
    expect(stepFor("ArrowLeft", 0, scale)).toBe(0);
    expect(stepFor("q", 50, scale)).toBeNull();
  });
});
