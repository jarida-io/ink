/**
 * The frame every text-like control wears, so an input, a select, a search
 * field and a number field focus, fail and rest identically.
 *
 * Focus thickens the line from one pixel to two. The padding gives that pixel
 * back, so the text inside does not shift when the caret arrives.
 */
import type { TextStyle, ViewStyle } from "react-native";
import type { InkTheme } from "../tokens/theme.js";

export interface FieldState {
  focused?: boolean;
  invalid?: boolean;
}

export function fieldFrame(theme: InkTheme, state: FieldState, padX: number = theme.space[3]): ViewStyle {
  const width = state.focused ? theme.edge.borderWidth : theme.edge.hairlineWidth;
  return {
    borderWidth: width,
    borderColor: state.invalid
      ? theme.color.dangerFg
      : state.focused
        ? theme.color.accentLine
        : theme.color.lineStrong,
    paddingHorizontal: padX - width,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
  };
}

/**
 * A single-line input's text, without the line height. On iOS a `lineHeight`
 * on a one-line `TextInput` pushes the glyphs below centre; the box's own
 * height does the centring instead.
 */
export function singleLine(style: TextStyle): TextStyle {
  const { lineHeight: _drop, ...rest } = style;
  return { ...rest, paddingVertical: 0, includeFontPadding: false };
}
