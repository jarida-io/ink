/**
 * Slider maths: a position on a track becomes a value on a scale.
 *
 * Shared because getting it subtly wrong is easy and invisible. The thumb has
 * width, so the travel is the track minus the thumb, and the value has to be
 * measured from the thumb's centre — miss that and the slider reaches its
 * maximum before the thumb reaches the end, by exactly half a thumb.
 */

export interface SliderScale {
  min: number;
  max: number;
  step: number;
  /** Track length in px. */
  length: number;
  /** Thumb diameter in px. The travel is `length - thumb`. */
  thumb: number;
}

/** Where the thumb's leading edge sits, in px from the track's start. */
export function thumbOffset(value: number, scale: SliderScale): number {
  const span = scale.max - scale.min;
  const ratio = span === 0 ? 0 : (clampValue(value, scale) - scale.min) / span;
  return ratio * Math.max(0, scale.length - scale.thumb);
}

/** The value for a pointer at `x` px from the track's start. */
export function valueAt(x: number, scale: SliderScale): number {
  const travel = Math.max(1, scale.length - scale.thumb);
  // Measured from the thumb's centre, not its edge.
  const ratio = Math.min(1, Math.max(0, (x - scale.thumb / 2) / travel));
  const raw = scale.min + ratio * (scale.max - scale.min);
  return clampValue(snap(raw, scale), scale);
}

function snap(value: number, scale: SliderScale): number {
  if (scale.step <= 0) return value;
  const steps = Math.round((value - scale.min) / scale.step);
  const snapped = scale.min + steps * scale.step;
  // Re-round to the step's own precision: 0.1 steps accumulate float error
  // fast enough to show up as 1.7000000000000002 in a readout.
  const places = (String(scale.step).split(".")[1] ?? "").length;
  return places > 0 ? Number(snapped.toFixed(places)) : snapped;
}

export function clampValue(value: number, scale: SliderScale): number {
  return Math.min(scale.max, Math.max(scale.min, value));
}

/**
 * Keyboard stepping. Arrows move by one step, Page keys by ten, Home and End go
 * to the ends. Returns null for a key that is not ours.
 */
export function stepFor(key: string, value: number, scale: SliderScale): number | null {
  const big = scale.step * 10;
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return clampValue(snap(value + scale.step, scale), scale);
    case "ArrowLeft":
    case "ArrowDown":
      return clampValue(snap(value - scale.step, scale), scale);
    case "PageUp":
      return clampValue(snap(value + big, scale), scale);
    case "PageDown":
      return clampValue(snap(value - big, scale), scale);
    case "Home":
      return scale.min;
    case "End":
      return scale.max;
    default:
      return null;
  }
}
