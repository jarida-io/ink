/**
 * The glass bar.
 *
 * Chrome, so it never wears the ink edge — that treatment belongs to whatever
 * the screen is actually for. What it gets instead is a material: a derived
 * tint, a blur where the engine has one, and a specular hairline along the top.
 * The argument for admitting a second material at all is at the top of
 * `tokens/glass.ts`.
 *
 * ## The scroll edge
 *
 * At the top of a page the bar is nothing: transparent, no rule, no shadow. The
 * moment content passes under it the material asserts itself. Apple do this and
 * it is worth copying for a reason that is not fashion — an always-on bar
 * spends contrast before it has anything to separate, and a bar that appears
 * tells you there is something above you.
 *
 * It is driven by an `IntersectionObserver` on a one-pixel sentinel rather than
 * a scroll listener. A scroll handler fires on every frame of every scroll; the
 * observer fires twice per page. On a six-core board that is also running a
 * language model, that difference is the whole reason to care.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInkTheme } from "./InkProvider.js";

export type InkNavbarVariant = "sticky" | "floating" | "static";

export interface InkNavbarProps {
  /** The screen's name. Set in the house italic, and truncated rather than wrapped. */
  title?: ReactNode;
  /** Back button, logo, menu — whatever anchors the left. */
  lead?: ReactNode;
  /** Actions. Keep it to two; a third is a menu. */
  trail?: ReactNode;
  variant?: InkNavbarVariant;
  /**
   * Stay clear until content scrolls under, then take the material.
   *
   * Off for a bar over a page that never scrolls, where it would simply never
   * appear.
   */
  scrollAware?: boolean;
  /**
   * Force the scrolled state.
   *
   * The one prop whose *derivation* differs by platform. On the web, leaving it
   * out lets the bar work it out from a sentinel. React Native has no
   * IntersectionObserver, so there it defaults to taking the material and the
   * app passes this from its own `onScroll`. Same prop, same meaning, and the
   * difference is stated rather than hidden behind two component names.
   */
  scrolled?: boolean;
  /** Replaces `title`, `lead` and `trail` when the bar needs its own layout. */
  children?: ReactNode;
  className?: string;
}

export function InkNavbar({
  title,
  lead,
  trail,
  variant = "sticky",
  scrollAware = true,
  scrolled: forced,
  children,
  className,
}: InkNavbarProps) {
  useInkTheme();
  const sentinel = useRef<HTMLDivElement>(null);
  // Starts ON, and the observer turns it off once it has actually reported.
  //
  // The other way round is the obvious way round and it is wrong: any
  // environment where the observer is stubbed, throttled or simply never fires
  // leaves a transparent bar sitting over content that is already scrolling
  // under it — illegible, permanently, with nothing to indicate why. Starting
  // on costs at most one frame of material at the top of a page, and that frame
  // fades rather than blinking because the bar transitions. Fail toward
  // legible.
  const [observed, setScrolled] = useState(true);
  const scrolled = forced ?? observed;

  useEffect(() => {
    if (!scrollAware || forced !== undefined) {
      setScrolled(true);
      return;
    }
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setScrolled(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [scrollAware, forced]);

  const classes = [
    "ink-glass",
    "ink-navbar",
    variant !== "static" && `ink-navbar--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {scrollAware && forced === undefined ? (
        <div ref={sentinel} className="ink-navbar__sentinel" aria-hidden="true" />
      ) : null}
      <header className={classes} data-scrolled={scrolled}>
        {children ?? (
          <>
            {lead ? <div className="ink-navbar__lead">{lead}</div> : null}
            {title ? <h1 className="ink-navbar__title">{title}</h1> : null}
            <div className="ink-navbar__spacer" />
            {trail ? <div className="ink-navbar__trail">{trail}</div> : null}
          </>
        )}
      </header>
    </>
  );
}
