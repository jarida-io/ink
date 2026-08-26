/**
 * The scroll-driven stage, shared by every surface that floats over content.
 *
 * `InkNavbar` and `InkBottomBar` both need "watch a scroller, run `nextStage`,
 * coalesce to one reading per frame". Written twice, the two drift: one gets a
 * `passive` listener and the other does not, one coalesces and the other runs
 * its logic on every event. Written once, a third surface is free.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { NAVBAR_DEFAULTS, nextStage, type NavbarConfig, type NavbarStage } from "../headless/navbar.js";

export interface UseStageOptions {
  /** Overrides the derived value entirely. */
  stage?: NavbarStage;
  behaviour?: Partial<NavbarConfig>;
  /** False pins it expanded — for a surface that is not over a scroller. */
  collapse?: boolean;
  scrollTarget?: HTMLElement | null;
  onStageChange?: (stage: NavbarStage) => void;
}

export function useStage({
  stage: forced,
  behaviour,
  collapse = false,
  scrollTarget,
  onStageChange,
}: UseStageOptions): NavbarStage {
  const config = useMemo<NavbarConfig>(
    () => ({
      ...NAVBAR_DEFAULTS,
      ...behaviour,
      // A threshold of zero is how the state machine already says "never", so
      // opting out of collapse needs no second flag for `nextStage` to weigh.
      collapseAt: collapse ? (behaviour?.collapseAt ?? NAVBAR_DEFAULTS.collapseAt) : 0,
    }),
    [collapse, behaviour],
  );

  // Starts expanded: the whole surface is the most usable one, so an
  // environment where the listener never fires gets that rather than a stub.
  const [observed, setStage] = useState<NavbarStage>("expanded");
  const current = forced ?? observed;
  const ref = useRef<NavbarStage>(current);
  ref.current = current;

  useEffect(() => {
    if (forced !== undefined || typeof window === "undefined") return;
    const target: HTMLElement | Window = scrollTarget ?? window;
    let last = readOffset(target);
    let queued = false;

    const onScroll = () => {
      // One reading per frame. A scroll handler that runs its logic on every
      // event runs it dozens of times per frame on a trackpad, and the answer
      // cannot change more than once per paint anyway.
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const y = readOffset(target);
        const next = nextStage(ref.current, { scrollY: y, delta: y - last }, config);
        last = y;
        if (next !== ref.current) {
          setStage(next);
          onStageChange?.(next);
        }
      });
    };

    onScroll();
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [forced, scrollTarget, config, onStageChange]);

  return current;
}

/** Exposed so a caller that forced the stage can still push it back. */
export function useStageSetter() {
  return useState<NavbarStage>("expanded");
}

function readOffset(target: HTMLElement | Window): number {
  return target instanceof Window ? target.scrollY : target.scrollTop;
}
