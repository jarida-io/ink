/**
 * The house set — the eighteen glyphs Ink itself needs, as data.
 *
 * Without these a fresh install has no icons at all, and every getting-started
 * snippet would open with an npm install. They are also the glyphs the library
 * used to draw by hand in CSS: a hamburger built from three <span>s, an
 * overflow control built from three more, a rating ring built from a border.
 * Hand-drawn chrome is why a hamburger and a chevron never quite matched — they
 * were made by different means, on different grids, months apart.
 *
 * The geometry is lucide's, on lucide's 24x24 grid, so the house set and a
 * registered lucide set are the same drawing at the same weight rather than a
 * near-miss. Only "path" and "circle" appear here, which is what keeps the
 * React Native renderer down to two primitives.
 *
 * Vendored, not depended on: eighteen icons of path data is 1622 bytes, and
 * paying a dependency for that would cost more than it saves.
 *
 * ---
 * Icon geometry from Lucide (https://lucide.dev), ISC License.
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part
 * of Feather (MIT). All other copyright (c) for Lucide are held by Lucide
 * Contributors 2022.
 * ---
 */
import type { InkIconNode } from "./icons.js";

export const HOUSE_ICONS = {
  "menu": [["path", {"d":"M4 5h16"}], ["path", {"d":"M4 12h16"}], ["path", {"d":"M4 19h16"}]],
  "x": [["path", {"d":"M18 6 6 18"}], ["path", {"d":"m6 6 12 12"}]],
  "check": [["path", {"d":"M20 6 9 17l-5-5"}]],
  "chevron-down": [["path", {"d":"m6 9 6 6 6-6"}]],
  "chevron-up": [["path", {"d":"m18 15-6-6-6 6"}]],
  "chevron-left": [["path", {"d":"m15 18-6-6 6-6"}]],
  "chevron-right": [["path", {"d":"m9 18 6-6-6-6"}]],
  "ellipsis": [["circle", {"cx":"12","cy":"12","r":"1"}], ["circle", {"cx":"19","cy":"12","r":"1"}], ["circle", {"cx":"5","cy":"12","r":"1"}]],
  "plus": [["path", {"d":"M5 12h14"}], ["path", {"d":"M12 5v14"}]],
  "minus": [["path", {"d":"M5 12h14"}]],
  "search": [["path", {"d":"m21 21-4.34-4.34"}], ["circle", {"cx":"11","cy":"11","r":"8"}]],
  "arrow-left": [["path", {"d":"m12 19-7-7 7-7"}], ["path", {"d":"M19 12H5"}]],
  "arrow-right": [["path", {"d":"M5 12h14"}], ["path", {"d":"m12 5 7 7-7 7"}]],
  "circle": [["circle", {"cx":"12","cy":"12","r":"10"}]],
  "info": [["circle", {"cx":"12","cy":"12","r":"10"}], ["path", {"d":"M12 16v-4"}], ["path", {"d":"M12 8h.01"}]],
  "triangle-alert": [["path", {"d":"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"}], ["path", {"d":"M12 9v4"}], ["path", {"d":"M12 17h.01"}]],
  "star": [["path", {"d":"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"}]],
  "loader-circle": [["path", {"d":"M21 12a9 9 0 1 1-6.219-8.56"}]],
} as const satisfies Record<string, InkIconNode>;

/** The names that always resolve, with nothing installed and nothing registered. */
export type HouseIconName = keyof typeof HOUSE_ICONS;
