/**
 * Tone — the only way to get colour out of this library.
 *
 * There is no `color` prop on any component here, and that is a decision rather
 * than an omission. "Never invent meaning the data lacks": the moment a chip
 * takes a hex, someone colour-codes a list of voices, and an interface that
 * colours things arbitrarily teaches people to read patterns that are not
 * there.
 *
 * The closed set below is every meaning the system has agreed exists. To colour
 * something you must first say which of these it is, and if it is none of them
 * it does not get colour — it gets the edge, or a hairline, or nothing.
 */
import { bestOn, readable } from "../tokens/contrast.js";
import type { InkPalette } from "../tokens/color.js";

export type InkTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

export interface ToneColors {
  /** Text and icons. Always clears 4.5:1 on `soft`. */
  fg: string;
  /** A quiet fill. Never a page background. */
  soft: string;
  /** The saturated value. Fills and rules only, never a sentence. */
  solid: string;
  /** What sits on `solid`. */
  onSolid: string;
}

// The two labels anything solid can carry. Picked per fill rather than assumed:
// white on the success green is 2.2:1.
const ON_SOLID = ["#171616", "#FFFFFF"];

/** The better label, and the fill nudged only as far as that label needs. */
function solid(fill: string): Pick<ToneColors, "solid" | "onSolid"> {
  const label = bestOn(ON_SOLID, fill);
  return { solid: readable(fill, label, "text"), onSolid: label };
}

export function toneColors(tone: InkTone, color: InkPalette): ToneColors {
  switch (tone) {
    case "brand":
      return {
        // The one tone whose foreground is a runtime value, so it is the one
        // that has to be derived. Teal measures 3.60:1 on Jarida White — a
        // legitimate edge and an illegal sentence — and a badge is a sentence.
        fg: readable(color.accent, color.brandSoft, "text"),
        soft: color.brandSoft,
        solid: color.accent,
        onSolid: color.textOnAccent,
      };
    case "success":
      return {
        fg: color.successFg,
        soft: color.successSoft,
        ...solid(color.success),
      };
    case "warning":
      return {
        fg: color.warningFg,
        soft: color.warningSoft,
        ...solid(color.warning),
      };
    case "danger":
      return {
        fg: color.dangerFg,
        soft: color.dangerSoft,
        solid: color.dangerFill,
        onSolid: color.textOnDanger,
      };
    case "info":
      return {
        fg: color.infoFg,
        soft: color.infoSoft,
        ...solid(color.info),
      };
    case "neutral":
    default:
      return {
        fg: color.textSecondary,
        soft: color.neutralSoft,
        ...solid(color.neutral),
      };
  }
}
