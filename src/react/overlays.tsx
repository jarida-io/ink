/**
 * The two overlays that are the same idea on both platforms.
 *
 * There is no tooltip and no popover here, and the inventory says why: a
 * hover-only affordance and a long-press affordance are not one component, and
 * a popover needs a portal and a positioning engine that React Native does not
 * have. `InkSheet` covers what a menu was being used for, with one behaviour.
 */
import { useEffect, useRef, type ReactNode } from "react";

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
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
      aria-labelledby="ink-dialog-title"
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
        <h2 id="ink-dialog-title" className="ink-dialog__title">
          {title}
        </h2>
        {description ? <p className="ink-prose">{description}</p> : null}
        {children}
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

export function InkSheet({
  open,
  onClose,
  side = "bottom",
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  side?: "bottom" | "right" | "left";
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

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
      aria-labelledby="ink-sheet-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="ink-sheet__panel">
        <h2 id="ink-sheet-title" className="ink-sheet__title">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
