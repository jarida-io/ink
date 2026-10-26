# Changelog

## 1.1.0 — unreleased

Every component went through in light and dark, on a phone, against what a
finger actually does. Nothing is renamed and no prop was removed.

### Things that were wrong

- **Icons inside filled controls took the page's text colour**, so a primary
  button's icon was charcoal on purple. A control now publishes its label colour
  and icons inherit it — `currentColor`, rebuilt for React Native.
- **A quiet button stood 2px taller than a primary one** beside it. Every
  variant's face is now the control height.
- **The destructive button's label was 3.55:1.** It fills with `dangerFill`
  (#DC2626) at 4.83:1. Every tone's `onSolid` is now picked per fill — white on
  the success green had been 2.2:1.
- **Choosing a pill moved its neighbours**, because the border thickened from one
  pixel to two. The padding gives the pixel back.
- **The slider read a touch on its own thumb as a touch at the start of the
  track**: `locationX` is relative to whichever child is under the finger. The
  position now comes from where the drag began plus how far it went, and a list
  scrolling underneath can no longer take the thumb away.
- **Spinners and progress rings never stopped** their loops on unmount, and froze
  under reduced motion so they read as broken. They stop, and slow instead.
- **The progress ring always showed at least half.** Each half now rotates a ring
  with two coloured sides, so it shows exactly its share.
- **A sheet's `slide` dragged the dimming in with it**, and `fade` faded the
  dialog panel as flat as the scrim. The scrim fades and the panel moves on its
  own spring, and a closing panel stays mounted until it has finished leaving.
- **The light scrim barely dimmed a dark page.** `scrim` is now a per-scheme
  token.
- **The backdrop set white text on the scrim**, 2.8:1 over a light page. The
  label sits on a card.
- **A dialog's title was not where a screen reader landed**, the iOS escape
  gesture did nothing, and the Android status bar stayed undimmed. All three are
  handled by the shell every overlay shares.
- **Chrome glyphs were characters** — `&times;`, `&#9662;`, `&lsaquo;`, `✓`, `↗` —
  drawn in whichever font had them, on their own baselines. They are drawn now,
  on the icon grid at the icon stroke.
- **The calendar's grid did not fill its width**, so the month header and the
  days disagreed about where the right edge was.
- **Autocomplete needed two taps** while the keyboard was up: the first only
  dismissed it.
- **`InkTextArea` was a fixed box**, centred its text vertically on Android, and
  ignored `maxRows`. It grows between `rows` and `maxRows` and then scrolls.
- **Single-line inputs sat low on iOS** under the body line height.
- **The fab did not wear the edge it claimed to**, and the speed dial spun the
  whole button, plate and all. The fab has its plate; only the mark turns.
- **`InkBottomBar`'s collapse worked once.** The puck's own push is cleared when
  the stage changes, and `onExpand` and `blurComponent` arrive from the patch
  Goose On The Go had been carrying.

### Things that were missing

- **Press feedback everywhere a finger lands.** Unchosen choices, flat cards,
  rows, list items, menu items, tabs, pagination, calendar days, steppers, chips
  and toast actions all answer on the way down.
- **`InkButton` `size` and `loading`.** Loading keeps the label, adds a spinner in
  the label's colour, and refuses presses.
- **Visible labels on `InkSwitch` and `InkCheckbox`** through `children`, as part
  of the target. `label` stays the accessible name.
- **`InkInput`** takes `type="password"`, icon names for `lead`/`trail`,
  `onSubmit`, and `inputProps` for everything else the platform input accepts.
  Focus is a two-pixel ring that does not shift the text.
- **`InkSheet`** takes `description`, `dismissible` and `scroll`. A bottom sheet has
  a handle that follows a drag 1:1, resists upward, and on release closes or
  springs back by where the flick is heading. It lifts above the keyboard and
  scrolls once it reaches the top.
- **`InkProvider` `insets`** on native, read by sheets, toasts, the fab and the
  bottom bar. `useInkInsets()` reads them back.
- **`InkNotice` `icon` and `action`** on native; `InkBadge` `icon` on native.
- **`InkSelect` `placeholder`**, `InkText` `numberOfLines`, `InkToaster` `offset`,
  and a tone mark on toasts.
- **An indeterminate meter paces** instead of sitting at a third; `InkDots` and
  the typing indicator run a wave instead of standing still.
- **Sliders are adjustable** to VoiceOver and TalkBack, and a held thumb rises onto
  its plate.
- **Motion tokens**: `SPRING`, `springPhysics`, `projectMomentum`, `rubberband`,
  and one `DISABLED_OPACITY` where a menu item, a page arrow and a button had
  each faded by a different amount.

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

### Also fixed

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
