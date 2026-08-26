/**
 * Resolving type for a platform that does not agree with the other one.
 *
 * Three differences, each of which has cost a real afternoon somewhere:
 *
 * 1. **Weight.** The web picks a face out of a family. React Native on Android
 *    looks up one registered file by exact name and ignores `fontWeight`
 *    entirely, so `Quicksand` at 700 renders at 400.
 * 2. **Tracking.** CSS takes em; React Native takes points. A tracking value
 *    written once and used at two sizes is wrong at one of them.
 * 3. **Italic.** Quicksand ships no italic face. The web synthesises an oblique,
 *    which is where the screen-title style comes from. Android renders it
 *    upright and says nothing — the single most recognisable thing about this
 *    typography, silently deleted.
 *
 * All three are decided here so no component has to know about any of them.
 */
import {
  NATIVE_FONT_FILES,
  WEB_FONT_STACKS,
  TRACKING,
  type FontRole,
  type FontWeight,
  type TrackingName,
} from "../tokens/type.js";

export type InkPlatform = "web" | "native";

export interface ResolvedFont {
  fontFamily: string;
  /** Omitted on native, where it does nothing for a custom family. */
  fontWeight?: FontWeight;
  fontStyle?: "normal" | "italic";
  /** Degrees of horizontal slant to apply as a transform. Native fallback only. */
  slant?: number;
}

export interface FontRequest {
  role: FontRole;
  weight?: FontWeight;
  italic?: boolean;
  /** From the theme. False makes italic fall back to a slant. */
  hasTrueItalic?: boolean;
}

/**
 * The synthesised oblique a browser applies is around 11 degrees; 10 reads the
 * same at title sizes and stays clear of the descender clipping you get past
 * 12 on a tight line box.
 */
export const SLANT_DEGREES = -10;

export function resolveFont(platform: InkPlatform, request: FontRequest): ResolvedFont {
  const weight = request.weight ?? 400;
  const italic = request.italic ?? false;
  const hasTrueItalic = request.hasTrueItalic ?? platform === "web";

  if (platform === "web") {
    // The exact string the stylesheet writes, not a stack re-quoted by a rule
    // this file invented. Two spellings of the same font list is one spelling
    // too many, and `css.test.ts` compares one of them against the product.
    return {
      fontFamily: WEB_FONT_STACKS[request.role],
      fontWeight: weight,
      fontStyle: italic ? "italic" : "normal",
    };
  }

  const family = NATIVE_FONT_FILES[request.role][weight];
  if (!italic) return { fontFamily: family };
  // A true italic face is the right answer if one has been registered. Without
  // one, slant it rather than let the style disappear.
  return hasTrueItalic
    ? { fontFamily: family, fontStyle: "italic" }
    : { fontFamily: family, slant: SLANT_DEGREES };
}

/**
 * Tracking in the unit the platform wants.
 *
 * Web keeps em, which stays correct if the size changes underneath it. Native
 * gets points resolved against the size it is being used at, which is the only
 * thing it accepts.
 */
export function tracking(
  platform: InkPlatform,
  name: TrackingName,
  fontSize: number,
): string | number {
  const em = TRACKING[name];
  if (platform === "web") return `${em}em`;
  return Math.round(em * fontSize * 100) / 100;
}

/**
 * The font names Expo has to load before any of this renders.
 *
 * Every weight of every role, deduplicated. Hand it to `useFonts` so a missing
 * face is a build-time list rather than a screen that looks subtly wrong.
 */
export function requiredNativeFonts(): string[] {
  const names = new Set<string>();
  for (const role of Object.keys(NATIVE_FONT_FILES) as FontRole[]) {
    for (const file of Object.values(NATIVE_FONT_FILES[role])) names.add(file);
  }
  return [...names].sort();
}
