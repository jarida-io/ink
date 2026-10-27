/**
 * The two overlays that are the same idea on both platforms.
 *
 * There is no tooltip and no popover here, and the inventory says why: a
 * hover-only affordance and a long-press affordance are not one component, and
 * a popover needs a portal and a positioning engine that React Native does not
 * have. `InkSheet` covers what a menu was being used for, with one behaviour.
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Whether a scroller has content hidden past either edge. The hairline that
 * separates a pinned header or footer is drawn only then, as native draws it.
 */
function useScrollEdges(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ above: false, below: false });
  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const above = node.scrollTop > 0;
    const below = node.scrollTop + node.clientHeight < node.scrollHeight - 1;
    setEdges((e) => (e.above === above && e.below === below ? e : { above, below }));
  }, []);
  useEffect(() => {
    const node = ref.current;
    if (!open || !node || typeof ResizeObserver === "undefined") return;
    // The children too: content that grows inside a capped panel leaves the
    // scroller's own size unchanged.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of Array.from(node.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [open, measure]);
  return { ref, onScroll: measure, above: edges.above || undefined, below: edges.below || undefined };
}

/* ── Dialog ────────────────────────────────────────────────────────────────
 *
 * Built on the platform `<dialog>` element rather than a div with a z-index.
 * `showModal()` gives the focus trap, the Escape key, the inert background and
 * the top layer for free — four things a hand-rolled modal gets wrong, and the
 * focus trap is the one that gets wrong silently.
 *
 * `title` is required. A dialog whose heading is optional is a dialog a screen
 * reader announces as "dialog".
 */

export interface InkDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  /** Buttons. The confirming one goes last, where the eye finishes. */
  actions?: ReactNode;
  /** False for a dialog that must be answered rather than dismissed. */
  dismissible?: boolean;
  children?: ReactNode;
  className?: string;
}

export function InkDialog({
  open,
  onClose,
  title,
  description,
  actions,
  dismissible = true,
  children,
  className,
}: InkDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // Per instance: two dialogs sharing one id label each other.
  const titleId = useId();
  const edges = useScrollEdges(open);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal?.();
    if (!open && node.open) node.close?.();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cx("ink-dialog", className)}
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Escape reaches this even when the dialog is not dismissible, so it is
        // refused here rather than left to close something that must be
        // answered.
        if (!dismissible) e.preventDefault();
        else onClose();
      }}
      onClick={(e) => {
        // The backdrop is the dialog element itself; a click on a child does
        // not land here, so this is the click-outside without a wrapper div.
        if (dismissible && e.target === ref.current) onClose();
      }}
    >
      <div className="ink-dialog__panel">
        {/* Past the viewport's height the words scroll and the answers stay:
            a dialog whose buttons are below the fold cannot be answered. */}
        <div
          ref={edges.ref}
          onScroll={edges.onScroll}
          className={cx("ink-dialog__body", !!actions && "ink-dialog__body--answered")}
          data-below={edges.below}
        >
          <h2 id={titleId} className="ink-dialog__title">
            {title}
          </h2>
          {description ? <p className="ink-prose">{description}</p> : null}
          {children}
        </div>
        {actions ? <div className="ink-dialog__actions">{actions}</div> : null}
      </div>
    </dialog>
  );
}

/* ── Sheet ─────────────────────────────────────────────────────────────────
 *
 * Anchored to an edge rather than floating in the middle. The shape a panel on
 * a shelf wants: it arrives from a direction, it does not cover the whole
 * screen, and a thumb can reach the top of it.
 */

export interface InkSheetProps {
  open: boolean;
  onClose: () => void;
  side?: "bottom" | "right" | "left";
  title: string;
  description?: ReactNode;
  /** False for a sheet that must be answered: no backdrop, no Escape. */
  dismissible?: boolean;
  /**
   * The body scrolls once the sheet is as tall as the viewport allows. Turn it
   * off only when the body brings its own list that must be the scroller.
   */
  scroll?: boolean;
  children?: ReactNode;
  className?: string;
}

export function InkSheet({
  open,
  onClose,
  side = "bottom",
  title,
  description,
  dismissible = true,
  scroll = true,
  children,
  className,
}: InkSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const edges = useScrollEdges(open && scroll);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal?.();
    if (!open && node.open) node.close?.();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cx("ink-sheet", `ink-sheet--${side}`, className)}
      aria-labelledby={titleId}
      onCancel={(e) => {
        if (!dismissible) e.preventDefault();
        else onClose();
      }}
      onClick={(e) => {
        if (dismissible && e.target === ref.current) onClose();
      }}
    >
      <div className="ink-sheet__panel">
        <div className="ink-sheet__head">
          <h2 id={titleId} className="ink-sheet__title">
            {title}
          </h2>
          {description ? <p className="ink-sheet__description">{description}</p> : null}
        </div>
        <div
          ref={edges.ref}
          onScroll={scroll ? edges.onScroll : undefined}
          className="ink-sheet__body"
          data-scroll={scroll || undefined}
          data-above={edges.above}
        >
          {children}
        </div>
      </div>
    </dialog>
  );
}
