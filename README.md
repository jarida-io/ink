# Ink

The design library for Jarida products, on React and on React Native / Expo.

One idea, stated once: **paper, one purple line, and the height between them.** A card is a sheet
with a 2px charcoal border, printed 4px above a hard purple plate. Choosing something raises it;
pressing it drives it back down onto the plate. Nothing else on the screen raises its voice.

`DESIGN.md` in the repository root is the argument. This is the argument made executable — the
tokens, the geometry, the components, and three rules the library holds so a document does not have
to.

---

## Install

```bash
npm install @jarida/ink
```

Ships as ES modules with declarations, and no bundle. A design library has no business bundling:
every consumer already runs a bundler that wants to tree-shake and transform it its own way, and
this is also the only build the package can do without taking on a dependency it would have to keep
alive. Relative imports carry `.js` extensions, so it loads under a bundler *and* under Node's own
ESM resolver &mdash; SSR and a plain `node -e` both work.

### From a sibling checkout, without publishing

While the library and a product are being developed together, skip the registry and resolve the
package from source. `inkAlias()` is the package's own wiring, so the entry points are named once:

```ts
// vite.config.ts  — and again in vitest.config.ts, which does not inherit it
import { inkAlias } from "../../jarida-ink/vite-alias";

resolve: { alias: [...inkAlias(resolve(__dirname, "../../jarida-ink"))] }
```

Then add the same two paths to `tsconfig.json`. Editing a token and seeing it on screen is one save
rather than a build, a publish and an install.

### Web

```tsx
import "@jarida/ink/web/ink.css";
import { InkProvider, InkCard, InkTitle } from "@jarida/ink/web";

<InkProvider accent="Purple" scheme="light">
  <InkTitle>Settings</InkTitle>
  <InkCard>…</InkCard>
</InkProvider>;
```

`InkProvider` writes the tokens as CSS custom properties. Pass `scoped={false}` to write them to
`<html>` instead — that is the mode that lets an existing product adopt the library without
touching a stylesheet, because the names emitted are the names its CSS already reads
(`--color-accent`, `--shadow-ink`, `--space-4`, `--tap-min`, and about sixty more).

### Expo

Load the fonts before rendering anything. React Native registers one file per weight, so a family
name plus a `fontWeight` is not enough — see [Four things that cannot be the same](#four-things-that-cannot-be-the-same).

```tsx
import { useFonts } from "expo-font";
import {
  Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold,
} from "@expo-google-fonts/quicksand";
import {
  JetBrainsMono_400Regular, JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold, JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { InkProvider, InkCard, InkTitle } from "@jarida/ink/native";

export default function App() {
  const [ready] = useFonts({
    Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold,
    JetBrainsMono_400Regular, JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold, JetBrainsMono_700Bold,
  });
  if (!ready) return null;

  return (
    <InkProvider accent="Purple">
      <InkTitle>Settings</InkTitle>
      <InkCard>…</InkCard>
    </InkProvider>
  );
}
```

`requiredNativeFonts()` returns exactly that list, so a missing face is a list you can diff rather
than a screen that looks subtly wrong.

---

## The edge

Everything else here is a palette and a grid. This is the part that makes a screen recognisably
ours, and the part that does not survive a naive port.

The shipped stylesheet writes it as a shadow whose offset changes, plus a transform that
compensates:

```css
box-shadow: var(--ink-lift) var(--ink-lift) 0 var(--border-ink);
transform:  translate(calc(4px - var(--ink-lift)), calc(4px - var(--ink-lift)));
```

Work the arithmetic through and something useful falls out. A box-shadow is drawn relative to the
box, so:

| state | face at | plate at |
|---|---|---|
| rest | 0 | +4 |
| raised (`--ink-lift: 7`) | -3 | -3 + 7 = **+4** |
| pressed (`--ink-lift: 0`) | +4 | +4 + 0 = **+4** |

**The plate never moves. Only the face does.** That is the physical reading — a sheet lifting off a
printed mark and being pressed back onto it — and it is also why the edge is portable at all,
because "a static plate behind a moving face" is two views, and two views exist everywhere. A hard
offset shadow does not.

So:

- **Web** keeps the shadow form. It is what ships, it costs no extra element, and `--ink-lift` keeps
  its name so the library and the existing stylesheets are talking about the same number.
- **Native** draws the plate as an absolutely positioned sibling.

### Why the native version is two views and not `boxShadow`

Recent React Native takes a `boxShadow` string, so this could have been a one-liner. Three reasons
it is not, all of which matter more than the line count:

1. **The plate is the honest model.** Two views say "a static mark and a moving sheet". A shadow
   whose offset changes and a transform that cancels it out says the same thing by accident.
2. **It renders the same everywhere.** No version gate, no `Platform.select`, no difference between
   architectures, no iOS shadow properties quietly reinterpreting `shadowRadius: 0`.
3. **It reserves its own space.** A shadow costs no layout, so on the web a grid of ink cards has
   its plates overlapping the gutter. Here the plate is a real view inside a real box, and a row of
   cards spaces correctly without anyone hand-tuning the gap.

The geometry is arranged so nothing ever overflows, which is what keeps Android's clipping out of
the picture. The outer view has **no padding** — the detail that makes it version-proof, because
absolute insets are measured from the padding box in CSS and historically from the content box in
Yoga, and with zero padding those are the same rectangle:

```
outer:  sized by the face plus 4 on the trailing edges
plate:  (4, 4) to (W, H)            — the face's size, offset down-right, never moves
face:   (0, 0) to (W - 4, H - 4)    — translated by `shift`
```

At rest `shift` is 0; at pressed it is +4, which lands the face exactly on the plate and exactly
inside the outer box. The one state that would overflow is `raised`, at -3 — and it is unreachable,
because `edgeStateFor("native", …)` never returns it. A finger has no hover.

---

## Four things that cannot be the same

Everything else in this library has one behaviour on both platforms. These four do not, and each is
a property of the platform rather than a choice.

| | Web | Native | Why |
|---|---|---|---|
| **Hover** | `raised` lifts the face to 7px | never reached | A finger has no hover. Asking for the rung would leave a control that never rests |
| **Layout cost** | the plate costs nothing; opt in with `reserve` | the plate always reserves 4px | A shadow is painted, a view is laid out |
| **Reach** | a `::after` that receives the pointer | `hitSlop={{top, bottom, left: 0, right: 0}}` | Same rule, same numbers. React Native's per-side `hitSlop` happens to be exactly the shape the rule already had |
| **Title italic** | a synthesised oblique | a `skewX` slant, unless a real italic is loaded | Quicksand ships no italic face. Android renders `fontStyle: "italic"` upright on a custom family, silently |

The third one is worth a sentence. The rule is *grow the hit area vertically only*, because growing
sideways makes adjacent pills steal each other's taps — wrong rather than merely fiddly. That the
same sentence describes `hitSlop` without adaptation is the best evidence available that it was the
right rule.

---

## Components

Same names, same props, both platforms — with one deliberate asymmetry: the escape hatch is
`className` on the web and `style` on native, because pretending otherwise would mean shipping a
style system nobody asked for.

| | What it is | When |
|---|---|---|
| `InkCard` | The edge, around content | The thing the screen is *for*. Never chrome |
| `InkGroup` | One card holding rows | When the grouping is the structure worth drawing |
| `InkRow` | Label, description, control | One control per row — that is what makes the row clear 44px |
| `InkField` | Eyebrow, current value, control | A form field with a name and a reading |
| `InkChoice` | Elevation as the only channel that says *chosen* | Voices, tiers, filters, tabs |
| `InkSegmented` | A radio group of choices | Any enumerated setting |
| `InkButton` | `primary` \| `quiet` \| `danger` | About one `primary` per screen |
| `InkSwitch` | On or off | Only when the change applies on flip |
| `InkStage` | A quiet inset: border, soft fill, no plate | Inside a card that already carries the edge |
| `InkNotice` | Say what happened, not that something did | Errors announce; everything else waits to be read |
| `InkMeter` | A transfer or a level | Omit `value` and it paces instead of claiming a percentage |
| `InkBadge` | A fact, set in mono | A grade, a size, a count |
| `InkTitle` | Bold italic, `-0.02em` | The screen's name |
| `InkEyebrow` | Mono, caps, `0.14em` | Structural type. A group separated by one needs no rule and no box |
| `InkProse` | Body copy meant to be read | Descriptions, advice, the sentence that decides whether someone spends 326 MB |
| `InkBudget` | Counts raised surfaces | Wrap a screen |

### `InkChoice` is the important one

```tsx
<InkChoice selected={voice === "bella"} onSelect={pick} meta="Grade A">
  Bella
</InkChoice>
```

State is elevation, not hue. A chosen thing rises on its offset; everything unchosen lies flat with
a hairline. There is no selected-colour, no tinted background, no check mark doing the edge's job —
because colour is the page's scarcest material, and spending it on *this one* leaves nothing for
the control that is actually asking a question.

`meta` is set in mono at label size. That is what stops a grade or a size competing with the name it
belongs to: it is data, and it reads as data.

---

## Three rules the library holds

A design document can state a rule. A library can refuse to let you break it. These three are the
ones that erode fastest, because every individual violation is reasonable and the damage only shows
up in aggregate.

### 1. There is no `color` prop

Anywhere. Not on a badge, not on a chip, not on a notice. Colour comes from a closed set of tones —
`neutral`, `brand`, `success`, `warning`, `danger`, `info` — so you have to name the meaning before
you can have the hue, and if it is none of them it does not get colour. It gets the edge, or a
hairline, or nothing.

The rule behind it is *never invent meaning the data lacks*. The moment a chip takes a hex, someone
colour-codes a list of voices, and an interface that colours things arbitrarily teaches people to
read patterns that are not there. A test asserts the prop does not exist.

### 2. The edge budget

```tsx
<InkBudget max={2} label="Settings">…</InkBudget>
```

Every edge-bearing component registers itself. Past the budget, the provider says so — once, in
development, and never by refusing to render, because an interface that will not draw because of a
design rule is worse than the rule being broken.

`InkChoice` only counts while it is selected. A row of twelve voices spends one edge, not twelve.
That is the whole reason state is elevation rather than a colour: the treatment stays rare no matter
how long the row.

### 3. Contrast is derived, not asserted

`DESIGN.md` asks for the measured ratio in the comment beside every colour. A comment is a promise
nothing checks. The WCAG maths ships with the tokens, the ratios are asserted in
`contrast.test.ts`, and the three values that depend on a runtime accent are computed rather than
written down:

- **`accentLine`** — the accent when it is a line rather than a fill, derived to clear 3:1 on every
  ground it can land on.
- **`focus`** — the same value, under the name it is used by.
- **`textOnAccent`** — charcoal or white, whichever reads on the accent the household chose.

An accent is picked at runtime, so no test in any repository can see it. Deriving is the only
durable fix.

---

## What this found in the shipped system

Building the library meant measuring every pair, which turned up four defects that are live today.
Three are in the accent palettes and only show up for a household that changed the accent away from
Purple, which is why nobody has hit them.

| | Measured | Needs |
|---|---|---|
| Coral as a focus ring or a hovered card border | 2.80:1 on a white card, 2.55:1 on the sidebar | 3:1 |
| A white label on a Coral primary button | 2.80:1 | 4.5:1 |
| Teal or Magenta as accent-coloured text | 3.60:1, 4.41:1 | 4.5:1 |
| The ink plate in dark mode | 2.21:1 on the page, 2.00:1 on the panel | 3:1 |

The first is the same defect `--focus-ring` was split out of `--color-border-focus` to fix — the old
ring measured 2.06:1 — and the fix was measured for Purple only.

The last is the only place this library knowingly renders something different from the product. The
shipped stylesheet never overrides `--border-ink` for dark mode, so the plate stays `#5D23C2` on a
`#131119` page and the one treatment the whole system is built around all but disappears. Ink uses
`#B794FF` there, at 7.75:1. `css.test.ts` asserts both halves of that: that the shipped value fails,
and that the replacement passes. Every other divergence is listed in the same file with its reason,
and a test fails if an exemption stops being one.

---

## Tokens

`createTheme()` returns one fully resolved object. Nothing in it is a reference to anything else,
because the platform that cannot follow references is the one this library exists to reach.

```ts
import { createTheme, cssVariables, contrast, readable } from "@jarida/ink";

const theme = createTheme({ scheme: "dark", accent: "Teal", density: "compact" });
theme.color.ink;                 // "#B794FF"
contrast(theme.color.text, theme.color.bg);   // 15.7
cssVariables(theme)["--shadow-ink"];          // "4px 4px 0 #B794FF"
```

The emitter writes the names the existing stylesheets already read, and `css.test.ts` parses
`pond-desktop/src/styles/design-tokens.css` and asserts the two agree. **The light theme matches it
exactly, with no exemptions**, which is what makes "single source of truth" a claim rather than a
README heading.

Adopting the library on the web is therefore one import rather than a rewrite, and the emitter is
additive: tokens it does not define keep whatever the stylesheet said.

---

## Adopting it in an existing product

The path of least damage, in order:

1. **Tokens first.** Write `cssVariables(theme)` to `<html>` from wherever the product already
   applies its theme. The names emitted are the names most stylesheets already read, so this is one
   import rather than a rewrite, and it is additive &mdash; anything the emitter does not define keeps
   whatever the stylesheet said. Every screen is on the library from that moment, including the
   contrast fixes.
2. **Add the drift test**, so the two cannot separate quietly.
3. **New screens use the components.**
4. **Existing screens migrate when they are being touched anyway.**

There is no step that rewrites a working screen for the sake of it. The first two are worth doing in
one sitting; the last is worth doing never, if the screens are fine.

## Publishing

```bash
npm run verify && npm run build
npm publish --access public
```

`prepublishOnly` runs both anyway. The scope has to exist on the registry first, and the package is
public.

---

## Not in v1

Named, rather than half-built:

- **Slider.** The pace slider's ink thumb needs a `PanResponder` on native and pseudo-element
  surgery on the web, and the two would not share an implementation. Every component here exists on
  both platforms with the same props, and a slider would have been the first exception.
- **Dropdown / menu.** Needs a portal on the web and a modal on native. Same problem.
- **Dark-mode brand papers.** `brandSoft` has one hand-picked dark value; the light scheme gets a
  real ramp.
- **Density.** `theme.density` is carried and honoured by `densityScale()`, but no component reads
  it yet.

---

## Testing

```bash
npm run verify   # typecheck, native typecheck, 81 tests
npm run build    # the published shape: dist/ plus declarations
```

The native renderer is type-checked, not unit-tested. Running it would need a React Native runtime,
and a shimmed one would be testing the shim. `types/react-native.d.ts` is a deliberate subset:
anything that compiles against it compiles against the real types, and widening it to make something
pass is the signal to install React Native and check against the real thing.

`tsconfig.native.json` compiles without DOM types on purpose, so a `window` or a `document` reaching
`src/core` or `src/native` fails the build here rather than on a device.

CI runs all four &mdash; both type-checks, the tests, and the build. A library whose build is only
ever run by `npm publish` discovers its emit errors in front of everyone.

### The test that is not here

The strongest guarantee this library makes is that its light theme reproduces Goose In A Pond's
`design-tokens.css` **exactly, with no exemptions**. That test cannot live here: a published package
has no idea its consumers exist, and a copy of their stylesheet vendored into this repository would
be a snapshot that rots from the day it is taken.

So the obligation runs the other way. A product that adopts these tokens owes itself a drift test,
and it is the only side that can see both files. Goose In A Pond keeps its copy at
`pond-desktop/src/ink-adoption.test.ts`; copy that file when you adopt the library somewhere else.

---

*Maintained by Jerry Ochieng Anyumba for the Jarida Open Source Community. Apache-2.0. The judgment
this library encodes is written up as `DESIGN.md` in Goose In A Pond, alongside the Jarida Product &
Brand Design Heuristics.*
