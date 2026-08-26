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
import { readable } from "../tokens/contrast.js";
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
        solid: color.success,
        onSolid: "#FFFFFF",
      };
    case "warning":
      return {
        fg: color.warningFg,
        soft: color.warningSoft,
        solid: color.warning,
        onSolid: "#171616",
      };
    case "danger":
      return {
        fg: color.dangerFg,
        soft: color.dangerSoft,
        solid: color.danger,
        onSolid: "#FFFFFF",
      };
    case "info":
      return {
        fg: color.infoFg,
        soft: color.infoSoft,
        solid: color.info,
        onSolid: "#FFFFFF",
      };
    case "neutral":
    default:
      return {
        fg: color.textSecondary,
        soft: color.neutralSoft,
        solid: color.neutral,
        onSolid: "#FFFFFF",
      };
  }
}
