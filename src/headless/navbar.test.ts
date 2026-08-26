import { describe, expect, it } from "vitest";
import {
  NAVBAR_DEFAULTS,
  NavbarBehaviour,
  nextStage,
  stageHasMaterial,
  titlePlacement,
  type NavbarStage,
} from "./navbar.js";

const down = (scrollY: number, delta = 10) => ({ scrollY, delta });
const up = (scrollY: number, delta = -20) => ({ scrollY, delta });

describe("the three stages", () => {
  it("is whole at the top, whatever it was doing", () => {
    for (const stage of ["expanded", "condensed", "collapsed"] as NavbarStage[]) {
      expect(nextStage(stage, down(0))).toBe("expanded");
    }
  });

  it("condenses, then collapses, as the reader commits to the content", () => {
    expect(nextStage("expanded", down(10))).toBe("expanded");
    expect(nextStage("expanded", down(40))).toBe("condensed");
    expect(nextStage("condensed", down(300))).toBe("collapsed");
  });

  it("does not collapse when collapse is switched off", () => {
    const config = { ...NAVBAR_DEFAULTS, collapseAt: 0 };
    expect(nextStage("condensed", down(900), config)).toBe("condensed");
  });

  it("stays whole on a page that does not scroll", () => {
    const config = { ...NAVBAR_DEFAULTS, enabled: false };
    expect(nextStage("collapsed", down(900), config)).toBe("expanded");
  });
});

describe("getting the navigation back", () => {
  /**
   * The rule the ordering in `nextStage` exists for. Collapsing frees the
   * screen, but it also takes navigation away from a reader still moving
   * through the page, so reaching for it must never mean out-scrolling a
   * threshold.
   */
  it("returns the bar on an upward gesture without waiting for a threshold", () => {
    expect(nextStage("collapsed", up(800))).toBe("condensed");
    expect(nextStage("condensed", up(10))).toBe("expanded");
  });

  it("ignores a wobble, so an elastic bounce does not summon it", () => {
    expect(nextStage("collapsed", { scrollY: 800, delta: -4 })).toBe("collapsed");
  });
});

describe("hysteresis", () => {
  /**
   * Without it a reader resting on a boundary — trackpad inertia, a thumb held
   * on a rubber-banding list — crosses it repeatedly and the bar strobes.
   */
  it("uses different boundaries for entering and leaving a stage", () => {
    const enter = NAVBAR_DEFAULTS.collapseAt;
    const leave = enter - NAVBAR_DEFAULTS.hysteresis;

    // Just under the entry threshold, coming down: not yet collapsed.
    expect(nextStage("condensed", down(enter - 1))).toBe("condensed");
    // At it: collapsed.
    expect(nextStage("condensed", down(enter))).toBe("collapsed");
    // Drifting back a few pixels does NOT give the stage up again.
    expect(nextStage("collapsed", down(enter - 1, 1))).toBe("collapsed");
    expect(nextStage("collapsed", down(leave + 1, 1))).toBe("collapsed");
    // Past the leave boundary it does.
    expect(nextStage("collapsed", down(leave - 1, 1))).toBe("condensed");
  });

  it("never strobes when a reading oscillates on a boundary", () => {
    const at = NAVBAR_DEFAULTS.collapseAt;
    let stage: NavbarStage = "condensed";
    const seen: NavbarStage[] = [];
    // A reader resting on the threshold, jittering by a pixel each frame.
    for (let i = 0; i < 20; i += 1) {
      stage = nextStage(stage, { scrollY: at + (i % 2 === 0 ? 0 : -1), delta: i % 2 === 0 ? 1 : -1 });
      seen.push(stage);
    }
    expect(new Set(seen).size, `stage changed ${new Set(seen).size} ways on a 1px jitter`).toBe(1);
  });
});

describe("a large title", () => {
  it("moves into the bar at the same moment the material arrives", () => {
    // One moment, not two thresholds. Separate numbers is how the title and
    // the background end up changing a frame apart.
    for (const stage of ["expanded", "condensed", "collapsed"] as NavbarStage[]) {
      expect(titlePlacement(stage) === "in-bar").toBe(stageHasMaterial(stage));
    }
  });
});

describe("the material follows the stage", () => {
  it("is off only when the bar is whole at the top", () => {
    expect(stageHasMaterial("expanded")).toBe(false);
    expect(stageHasMaterial("condensed")).toBe(true);
    expect(stageHasMaterial("collapsed")).toBe(true);
  });
});

describe("the stateful wrapper", () => {
  it("tracks the delta so a host does not have to", () => {
    const bar = new NavbarBehaviour();
    expect(bar.scrolled(0)).toBe("expanded");
    expect(bar.scrolled(300)).toBe("collapsed");
    expect(bar.scrolled(280)).toBe("condensed");
  });

  it("notifies only on change", () => {
    const bar = new NavbarBehaviour();
    const seen: NavbarStage[] = [];
    bar.subscribe((s) => seen.push(s));
    bar.scrolled(10);
    bar.scrolled(12);
    bar.scrolled(400);
    bar.scrolled(420);
    expect(seen).toEqual(["collapsed"]);
  });

  it("can be forced, because a menu opening must not leave it collapsed", () => {
    const bar = new NavbarBehaviour();
    bar.scrolled(500);
    expect(bar.current()).toBe("collapsed");
    bar.set("expanded");
    expect(bar.current()).toBe("expanded");
  });
});
