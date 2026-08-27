# Changelog

## Unreleased

### Icons, named in plain text

- **`icon="search"` anywhere an element used to go**, identical on web and React
  Native. Every `icon` prop still accepts an element, so no call site breaks.
- **A registry rather than a dependency.** Lucide ships as two packages that do
  not run on each other's platform, so Ink owns the name and you inject the set.
  Any icon source works — components or geometry.
- **One canonical name.** `Search`, `SearchIcon`, `LucideSearch` and `search`
  collapse to one key, applied to what you register *and* what you write.
  A second lookup ignores hyphenation, which resolves the 32 lucide names whose
  export and filename disagree, and collides with none of the other 1736.
- **Eighteen built-in glyphs**, so a fresh install draws something. These replace
  chrome the stylesheet used to draw by hand out of `<span>`s and borders.
- **Derived size and compensated stroke** — `round(height * 0.45)` on the 4px
  grid, and `2 * 24 / size` in the viewBox, so 16, 20, 24 and 48 all render a
  two-pixel line instead of four different weights.
- **Decorative by default**, `aria-hidden` on web and both OS-specific props on
  native. `label` opts in to being announced.
- **A missing name reserves its space** and never renders as text; in dev it is
  outlined. Warnings distinguish "nothing registered" from "wrong name" and
  carry a suggestion.
- **`@jarida/ink/sweep`** — a build-time check for names nothing will answer,
  reaching JavaScript callers, `as any`, and literals in data files.

### Fixed

- The gallery declares its own charset, so a locally built `gallery.html` no
  longer renders em dashes as mojibake when served without one.
- `packaging.test.ts` now fails if an entry point is added to `exports` without
  a matching `vite-alias` rule — the catch-all rule had been hiding that, by
  resolving the new path to a file with no extension rather than failing.


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
