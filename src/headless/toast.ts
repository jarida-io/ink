/**
 * A notification queue with no framework and no timers of its own.
 *
 * The host supplies the clock — `schedule` is handed a callback and a delay —
 * which is what lets the same queue run under React, under a test with fake
 * timers, and under React Native without any of them disagreeing about when a
 * message goes away.
 */

export type ToastTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

export interface Toast {
  id: string;
  tone: ToastTone;
  text: string;
  action?: { label: string; onPress: () => void };
}

/**
 * How long a message stays, from how long it takes to read.
 *
 * A constant is wrong at both ends: four seconds is generous for "Saved" and
 * nowhere near enough for a sentence explaining what failed and what to do
 * about it. Roughly 200 words a minute, floored at 3s and capped at 12s.
 */
export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(12_000, Math.max(3_000, Math.round((words / 200) * 60_000) + 1_500));
}

export interface ToastQueueOptions {
  /** Defaults to `setTimeout`. Supply one to control the clock in a test. */
  schedule?: (fn: () => void, ms: number) => void;
  /** Most a screen shows at once; the oldest goes first. */
  max?: number;
}

export class ToastQueue {
  private items: Toast[] = [];
  private listeners = new Set<(items: Toast[]) => void>();
  private counter = 0;
  private schedule: (fn: () => void, ms: number) => void;
  private max: number;

  constructor(options: ToastQueueOptions = {}) {
    this.schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
    this.max = options.max ?? 3;
  }

  public show(toast: Omit<Toast, "id" | "tone"> & { tone?: ToastTone }): string {
    this.counter += 1;
    const id = `ink-toast-${this.counter}`;
    const item: Toast = { tone: "neutral", ...toast, id };
    this.items = [...this.items, item].slice(-this.max);

    // A danger message is never taken away on a timer: its text is the
    // instructions, and removing it removes the only thing that would let
    // someone act on it.
    if (item.tone !== "danger") {
      this.schedule(() => this.dismiss(id), readingTime(item.text));
    }
    this.emit();
    return id;
  }

  public dismiss(id: string): void {
    const next = this.items.filter((t) => t.id !== id);
    if (next.length === this.items.length) return;
    this.items = next;
    this.emit();
  }

  public clear(): void {
    if (this.items.length === 0) return;
    this.items = [];
    this.emit();
  }

  public all(): Toast[] {
    return this.items;
  }

  public subscribe(listener: (items: Toast[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.items);
  }
}
