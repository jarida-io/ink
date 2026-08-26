# Changelog

## 1.0.0

First release. Extracted from Goose In A Pond, where the ink edge had been
running in front of a household for a year and had been spelled three different
ways in the process.

### The library

- **Tokens** — colour, type, space, radius, motion and the edge, as one fully
  resolved object per theme. No references, because the platform that cannot
  follow a reference is the one this package exists to reach.
- **16 components**, same names and props on `@jarida/ink/web` and
  `@jarida/ink/native`.
- **The edge, ported.** Modelled as a static plate behind a moving face rather
  than as a shadow whose offset changes, which is what makes it drawable in two
  views on React Native.
- **Contrast maths** shipped with the tokens, and asserted rather than commented.

### Fixed on the way out

Four contrast defects that were live in the product, found by measuring every
pair instead of trusting the comments:

- **Coral as a line or a focus ring** — 2.80:1 on a white card, 2.55:1 on the
  sidebar, against the 3:1 a UI boundary needs. The same defect `--focus-ring`
  had been split out to fix for Purple, never re-measured for the other four
  accents. `accentLine` and `focus` are now derived per accent.
- **A white label on a Coral primary button** — 2.80:1 against a 4.5:1 floor.
  `textOnAccent` is now charcoal or white, whichever reads.
- **Teal and Magenta as accent-coloured text** — 3.60:1 and 4.41:1. The brand
  tone's foreground is now derived against the surface it sits on.
- **The ink plate in dark mode** — the product never overrode `--border-ink` for
  dark, leaving the plate at 2.21:1 on the page and 2.00:1 on the panel. The one
  treatment the whole system is built around, all but invisible. Dark now uses
  `#B794FF`, at 7.75:1.

### Known gaps

Named rather than half-built: no slider, no dropdown or menu, one hand-picked
dark brand paper rather than a ramp, and `theme.density` is carried but not yet
read by any component.
