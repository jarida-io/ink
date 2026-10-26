/**
 * The library's own chrome marks — chevrons, a close, a check — drawn with
 * views.
 *
 * They used to be text: `&times;`, `&#9662;`, `&lsaquo;`. A character is drawn
 * by whichever font has it, which is rarely the one the label is in, so each
 * sat on its own baseline at its own weight and none lined up with an icon
 * beside it. These are the house icons' lucide geometry on the same 24 grid at
 * the same two-pixel line, and they need nothing installed to draw.
 */
import type { ReactElement } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { ICON_STROKE } from "../tokens/control.js";
import { useIconPaint } from "./icon.js";
import { useInkTheme } from "./InkProvider.js";

type Line = readonly [x1: number, y1: number, x2: number, y2: number];
type Ring = readonly [cx: number, cy: number, r: number];

const GLYPHS = {
  "chevron-down": { lines: [[6, 9, 12, 15], [12, 15, 18, 9]] },
  "chevron-up": { lines: [[6, 15, 12, 9], [12, 9, 18, 15]] },
  "chevron-left": { lines: [[15, 6, 9, 12], [9, 12, 15, 18]] },
  "chevron-right": { lines: [[9, 6, 15, 12], [15, 12, 9, 18]] },
  x: { lines: [[6, 6, 18, 18], [18, 6, 6, 18]] },
  plus: { lines: [[5, 12, 19, 12], [12, 5, 12, 19]] },
  minus: { lines: [[5, 12, 19, 12]] },
  check: { lines: [[4, 12, 9, 17], [9, 17, 20, 6]] },
  "arrow-up-right": { lines: [[7, 17, 17, 7], [7, 7, 17, 7], [17, 7, 17, 17]] },
  search: { lines: [[16.66, 16.66, 21, 21]], rings: [[11, 11, 8]] },
} as const satisfies Record<string, { lines: readonly Line[]; rings?: readonly Ring[] }>;

export type GlyphName = keyof typeof GLYPHS;

export function Glyph({
  name,
  size = 20,
  paint,
  style,
}: {
  name: GlyphName;
  size?: number;
  /** Internal only. Otherwise the enclosing control's label colour, then text. */
  paint?: string;
  style?: StyleProp<ViewStyle>;
}): ReactElement {
  const theme = useInkTheme();
  const inherited = useIconPaint();
  const colour = paint ?? inherited ?? theme.color.text;
  const unit = size / 24;
  const stroke = ICON_STROKE;
  const glyph: { lines: readonly Line[]; rings?: readonly Ring[] } = GLYPHS[name];

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[{ width: size, height: size }, style]}
    >
      {glyph.lines.map(([x1, y1, x2, y2], i) => {
        const dx = (x2 - x1) * unit;
        const dy = (y2 - y1) * unit;
        // A round cap reaches half the stroke past each end, as SVG's does.
        const length = Math.hypot(dx, dy) + stroke;
        return (
          <View
            key={`l${i}`}
            style={{
              position: "absolute",
              left: ((x1 + x2) / 2) * unit - length / 2,
              top: ((y1 + y2) / 2) * unit - stroke / 2,
              width: length,
              height: stroke,
              borderRadius: stroke / 2,
              backgroundColor: colour,
              transform: [{ rotate: `${(Math.atan2(dy, dx) * 180) / Math.PI}deg` }],
            }}
          />
        );
      })}
      {glyph.rings?.map(([cx, cy, r], i) => (
        <View
          key={`r${i}`}
          style={{
            position: "absolute",
            left: (cx - r) * unit - stroke / 2,
            top: (cy - r) * unit - stroke / 2,
            width: 2 * r * unit + stroke,
            height: 2 * r * unit + stroke,
            borderRadius: r * unit + stroke,
            borderWidth: stroke,
            borderColor: colour,
          }}
        />
      ))}
    </View>
  );
}
