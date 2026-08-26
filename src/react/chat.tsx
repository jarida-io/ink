/**
 * Chat bubbles.
 *
 * The component that is almost always built wrong, in the same three ways.
 *
 * **1. The tail belongs to the group, not the bubble.** A run of four messages
 * from one person is one utterance interrupted by line breaks; giving every
 * bubble a tail makes it read as four separate interruptions. Only the last in
 * a run gets one, which is why `InkBubbleGroup` exists and why `position` is
 * computed rather than passed.
 *
 * **2. Side is not decoration.** `mine` decides alignment, colour and — the
 * part usually missed — the *order* the screen reader gets. A transcript that
 * reads "Yes ... Are you coming?" is not a transcript.
 *
 * **3. A bubble is not a paragraph.** It has a maximum measure so a long
 * message stays readable, and it never stretches to the width of the window
 * just because the window is wide.
 */
import type { ReactNode } from "react";

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

export type BubblePosition = "only" | "first" | "middle" | "last";

export interface InkBubbleProps {
  /** Sent by the reader. Decides side, fill and the tail's direction. */
  mine?: boolean;
  /** Where in a run of messages from the same sender. `only` gets a tail. */
  position?: BubblePosition;
  /** Shown under the bubble, on the last of a run. */
  meta?: ReactNode;
  /** `sending` fades it; `failed` marks it and keeps the text selectable. */
  status?: "sent" | "sending" | "failed";
  /** Who said it. Only rendered on the first of a run, and never for `mine`. */
  author?: string;
  children: ReactNode;
  className?: string;
}

export function InkBubble({
  mine = false,
  position = "only",
  meta,
  status = "sent",
  author,
  children,
  className,
}: InkBubbleProps) {
  const tail = position === "only" || position === "last";
  const first = position === "only" || position === "first";

  return (
    <div
      className={cx("ink-bubble", mine ? "ink-bubble--mine" : "ink-bubble--theirs", className)}
      data-position={position}
      data-status={status}
    >
      {author && first && !mine ? <span className="ink-bubble__author">{author}</span> : null}

      <div className="ink-bubble__body" data-tail={tail || undefined}>
        {children}
      </div>

      {meta || status === "failed" ? (
        <span className="ink-bubble__meta">
          {status === "failed" ? (
            // Not a colour alone, and not an icon alone: a message that failed
            // has to say so in words, because it is the one state where the
            // reader has to do something.
            <span className="ink-bubble__failed">Not sent</span>
          ) : null}
          {meta}
        </span>
      ) : null}
    </div>
  );
}

/* ── Group ─────────────────────────────────────────────────────────────────
 *
 * Works out each bubble's position in the run so the caller does not have to,
 * because "is this the last message from this person" is exactly the sort of
 * thing a caller gets right on the first render and wrong after an insert.
 */

export interface InkBubbleMessage {
  id: string;
  mine?: boolean;
  author?: string;
  text: ReactNode;
  meta?: ReactNode;
  status?: "sent" | "sending" | "failed";
}

export function InkBubbleGroup({
  label,
  messages,
  className,
}: {
  /** Names the transcript for a screen reader. */
  label: string;
  messages: InkBubbleMessage[];
  className?: string;
}) {
  return (
    <div className={cx("ink-bubbles", className)} role="log" aria-label={label} aria-live="polite">
      {messages.map((message, i) => {
        const sameAsPrev = i > 0 && messages[i - 1].mine === message.mine && messages[i - 1].author === message.author;
        const sameAsNext =
          i < messages.length - 1 &&
          messages[i + 1].mine === message.mine &&
          messages[i + 1].author === message.author;

        const position: BubblePosition =
          sameAsPrev && sameAsNext ? "middle" : sameAsPrev ? "last" : sameAsNext ? "first" : "only";

        return (
          <InkBubble
            key={message.id}
            mine={message.mine}
            author={message.author}
            position={position}
            meta={message.meta}
            status={message.status}
          >
            {message.text}
          </InkBubble>
        );
      })}
    </div>
  );
}

/* ── Typing ────────────────────────────────────────────────────────────────
 *
 * A bubble with three dots. It is `aria-hidden` on purpose: announcing "typing"
 * on every keystroke of the other person's message is the single most
 * disruptive thing a chat interface can do to a screen-reader user.
 */

export function InkTyping({ author, className }: { author?: string; className?: string }) {
  return (
    <div className={cx("ink-bubble", "ink-bubble--theirs", className)} data-position="only">
      {author ? <span className="ink-bubble__author">{author}</span> : null}
      <div className="ink-bubble__body" data-tail="true" aria-hidden="true">
        <span className="ink-typing">
          <span /><span /><span />
        </span>
      </div>
    </div>
  );
}
