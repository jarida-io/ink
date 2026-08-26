/**
 * Text styles, resolved for a platform that wants points and file names.
 *
 * Every call goes through `resolveFont` and `tracking` in `core/font.ts` so the
 * three ways React Native silently loses the house type — weight, tracking,
 * italic — are handled once rather than per component.
 */
import type { TextStyle } from "react-native";
import { resolveFont, tracking, type FontRequest } from "../core/font.js";
import type { FontRole, FontWeight, SizeName, TrackingName } from "../tokens/type.js";
import type { InkTheme } from "../tokens/theme.js";

export interface InkTextSpec {
  role?: FontRole;
  size?: SizeName;
  weight?: FontWeight;
  tracking?: TrackingName;
  leading?: keyof InkTheme["leading"];
  italic?: boolean;
  color?: string;
  uppercase?: boolean;
}

export interface InkTextResult {
  style: TextStyle;
  /** Degrees of slant, when the italic had to be faked. Apply as a transform. */
  slant?: number;
}

export function inkText(theme: InkTheme, spec: InkTextSpec = {}): InkTextResult {
  const size = theme.size[spec.size ?? "base"];
  const request: FontRequest = {
    role: spec.role ?? "body",
    weight: spec.weight ?? theme.weight.regular,
    italic: spec.italic,
    hasTrueItalic: theme.hasTrueItalic,
  };
  const font = resolveFont("native", request);

  const style: TextStyle = {
    fontFamily: font.fontFamily,
    fontSize: size,
    lineHeight: Math.round(size * theme.leading[spec.leading ?? "base"]),
    letterSpacing: tracking("native", spec.tracking ?? "none", size) as number,
    color: spec.color ?? theme.color.text,
  };

  if (font.fontStyle) style.fontStyle = font.fontStyle;
  if (spec.uppercase) style.textTransform = "uppercase";

  return { style, slant: font.slant };
}

/** The slant, as the transform React Native takes. */
export function slantTransform(degrees: number | undefined) {
  return degrees === undefined ? undefined : [{ skewX: `${degrees}deg` }];
}
