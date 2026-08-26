# Ink — agent reference

Dense, complete, and written to be read by a coding agent. Humans want
[README.md](../README.md); this file trades prose for coverage.

**Rule of thumb:** if you are about to write a `padding`, a `border-width`, a
hex colour or a `setTimeout` duration, there is a token or a headless function
for it. Look here first.

---

## 1. Entry points

| Import | Contains | Depends on |
|---|---|---|
| `@jarida/ink` | everything below with no framework in it | nothing |
| `@jarida/ink/tokens` | colour, type, space, motion, edge, glass, control, contrast, css | nothing |
| `@jarida/ink/core` | font resolution, edge geometry, reach, tone, env | nothing |
| `@jarida/ink/headless` | navbar / roving / toast / slider behaviour | nothing |
| `@jarida/ink/css` | the stylesheet | nothing |
| `@jarida/ink/react` | React DOM components | `react` |
| `@jarida/ink/native` | React Native components | `react`, `react-native` |

`react-native` is an **optional** peer. Importing `@jarida/ink` or
`@jarida/ink/react` in a project without it works.

**Never** import from `@jarida/ink/native` in web code, or from
`@jarida/ink/react` in native code. A test fails the build if the shared tiers
reach for either.

---

## 2. Setup, per framework

### React (Vite / Next / Remix / anything)

```tsx
import "@jarida/ink/css";
import { InkProvider, InkCard, InkButton } from "@jarida/ink/react";

<InkProvider scheme="light" accent="Purple">…</InkProvider>
```

`InkProvider` has three modes, and picking the wrong one is the most common
setup mistake:

| `mode` | Writes custom properties to | Use when |
|---|---|---|
| `"scoped"` *(default)* | a wrapper `<div class="ink">` | normal apps; also lets two themes coexist on one page |
| `"global"` | `document.documentElement` | you want existing stylesheets to pick the tokens up |
| `"context"` | nothing | you already write the tokens yourself; pass `theme={...}` |

### React Native / Expo

```tsx
import { useFonts } from "expo-font";
import { Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold } from "@expo-google-fonts/quicksand";
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_600SemiBold, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
import { InkProvider } from "@jarida/ink/native";
```

Fonts must load before render. `requiredNativeFonts()` returns the exact list.
Android ignores `fontWeight` on a runtime-registered family, so Ink resolves a
**family name per weight** — never pass `fontWeight` yourself.

### Vue, Svelte, Solid, vanilla — no React at all

```js
import "@jarida/ink/css";
import { createTheme, cssVariables } from "@jarida/ink";
import { NavbarBehaviour, rove, ToastQueue, valueAt } from "@jarida/ink/headless";

const theme = createTheme({ scheme: "dark", accent: "Teal" });
for (const [k, v] of Object.entries(cssVariables(theme))) {
  document.documentElement.style.setProperty(k, v);
}
```

Then write markup with the documented classes and `data-` attributes (§7). The
CSS does the appearance; the headless module does the behaviour. There is no
React in either.

---

## 3. Tokens

```ts
const theme = createTheme({
  scheme?: "light" | "dark",              // default "light"
  accent?: "Purple"|"Blue"|"Teal"|"Coral"|"Magenta",  // default "Purple"
  density?: "comfortable" | "compact",    // default "comfortable"
  hasTrueItalic?: boolean,                // native: false unless you loaded one
  animate?: boolean,                      // false honours reduced motion
});
```

`theme` fields: `color`, `edge`, `edgeCompact`, `space`, `radius`, `touch`,
`rowHeight`, `measure`, `size`, `weight`, `leading`, `tracking`, `duration`,
`easing`, `scheme`, `accent`, `density`, `hasTrueItalic`, `animate`.

### Three colour values are **derived, not stored**

Do not hardcode these; read them off the theme.

| Field | Derived how | Why |
|---|---|---|
| `color.accentLine` | accent walked until it clears **4.5:1** on every ground | raw Coral is 2.80:1 as a border |
| `color.focus` | same value | a focus ring is a line |
| `color.textOnAccent` | charcoal or white, whichever reads on the accent | white on Coral is 2.80:1 |

`color.accent` is the untouched brand value and is only ever a **fill**.

### Helpers

```ts
contrast(fg, bg): number            // WCAG ratio; throws if bg is translucent
ratio(fg, bg): number               // rounded to 2dp
passes(fg, bg, "text"|"largeText"|"nonText"): boolean
assertContrast(fg, bg, floor, label): void   // throws with the measurement
readable(colour, grounds, floor): string     // nearest version that clears
bestOn(candidates, ground): string           // whichever reads best
alpha(colour, amount): string                // resolved rgba()
flatten(fg, bg): Rgb                         // composite a translucent colour
grounds(palette): string[]                   // every ground a line can land on
```

### Control geometry — `@jarida/ink/tokens`

Never type a control's padding. It is derived from its height:
`padX = round(height * 0.36)` snapped to the 4px grid.

```ts
controlMetrics(size?, shape?)  // { height, padX, padY, radius, gap }
controlPadX(size, shape?)      // "sm"|"md"|"lg", "box"|"pill"
controlPadY(size)
CONTROL_HEIGHT   // sm 32, md 44 (touch floor), lg 52
CONTAINER_PAD    // card/panel padding — a SEPARATE scale from controls
BORDER           // { hairline: 1, ink: 2 }  — two widths, both whole pixels
```

There is no 1.5px. A fractional border resolves differently in every engine at
1x. If you want "heavier than a hairline", darken it — do not thicken it.

### Glass

```ts
glassSurface(theme, { over?, blur?, floor?, minAlpha? })
// { background, alpha, blur, saturate, rim, rimShade, worstCase, solid }
```

`alpha` is the **least opaque tint whose label still clears 4.5:1** over the
backdrops given. Default backdrops are black and white, i.e. anything — 0.497
light, 0.638 dark. Pass `over: [...]` when the product controls what is behind.
`minAlpha` (default 0.3) is a separate, aesthetic floor.

---

## 4. Headless behaviour — `@jarida/ink/headless`

Pure. No DOM, no React, no timers of its own.

```ts
// Navbar
type NavbarStage = "expanded" | "condensed" | "collapsed";
nextStage(current, { scrollY, delta }, config?): NavbarStage
stageHasMaterial(stage): boolean
new NavbarBehaviour(config?)   // .scrolled(y) .current() .set(s) .subscribe(fn) .configure(c)
NAVBAR_DEFAULTS = { condenseAt: 24, collapseAt: 220, hysteresis: 32, revealAfter: 8, enabled: true }

// Roving focus — tab lists, radio groups, toolbars
rove(key, currentIndex, count, { disabled?, wrap?, orientation? }): number | null
isRovingKey(key, orientation?): boolean

// Toasts
new ToastQueue({ schedule?, max? })   // .show() .dismiss() .clear() .all() .subscribe()
readingTime(text): number             // 200wpm, floored 3s, capped 12s

// Slider
valueAt(x, scale): number        // pointer px -> value, measured from thumb CENTRE
thumbOffset(value, scale): number
stepFor(key, value, scale): number | null
type SliderScale = { min, max, step, length, thumb }
```

**Behaviour facts an agent should not re-derive:**

- The navbar returns to `expanded` at `scrollY <= 0` from any stage.
- An upward gesture past `revealAfter` wins over every threshold.
- Entering a stage uses `threshold`; leaving uses `threshold - hysteresis`.
- A `danger` toast is **never** auto-dismissed.
- `rove` returns `null` for keys it does not own — let those through.

---

## 5. Components

Same names and props on `@jarida/ink/react` and `@jarida/ink/native`. The
escape hatch differs: `className` on React, `style` on native.

### Surfaces
```
InkCard    { raised?=true, pressable?=false, reserve?=false, onPress?, disabled? }
InkGroup   { title, meta?, raised?=true }
InkRow     { label, description?, children? }
InkField   { label, reading?, hint? }
InkStage   { }
InkStack   { direction?="column", gap?=3, align?, justify?, wrap? }
InkDivider { orientation?="horizontal", tone?="hairline"|"ink", label? }
```

### Controls
```
InkButton    { variant?="quiet"|"primary"|"danger", onPress?, disabled?, block?, icon? }
InkChoice    { selected, onSelect?, shape?="tile"|"pill", meta?, disabled?, role?="button"|"radio" }
InkSegmented { label, value, options[{value,label,meta?,disabled?}], onChange, shape? }
InkSwitch    { checked, onChange, label?, disabled? }
InkCheckbox  { checked, onChange, label, indeterminate?, disabled? }
InkInput     { value, onChange, label?, placeholder?, invalid?, disabled?, type?, lead?, trail? }
InkTextArea  { value, onChange, label?, placeholder?, rows?=3, maxRows?=12, disabled? }
InkSelect    { label, value, options[{value,label,disabled?}], onChange, disabled? }
InkSlider    { value, onChange, min?=0, max?=100, step?=1, label, format?, disabled? }
```

### Navigation
```
InkNavbar { title?, lead?, trail?, actions?, variant?="sticky"|"floating"|"static",
            collapse?=false, behaviour?, stage?, scrollTarget? (react),
            topInset?, blurComponent? (native) }
InkTabs       { label, value, tabs[{value,label,badge?,disabled?}], onChange }
InkBreadcrumb { items[{label,onPress?}], max?=4 }
```

### Feedback & data
```
InkNotice     { tone?, icon? }
InkMeter      { value?, label }          // omit value -> indeterminate
InkBadge      { tone?, icon? }
InkSpinner    { label, size?=18 }        // label is REQUIRED
InkSkeleton   { width?, height?=14, radius?, shimmer?=false }
InkEmptyState { icon?, title, action? }
InkAvatar     { name, src?, size?=32 }
InkToaster    { }                        // wrap the app; useInkToast() to show
InkTable      { caption, columns[{key,header,numeric?,render,width?}], rows, rowKey, empty? }
InkList       { label, empty? }
InkDialog     { open, onClose, title, description?, actions?, dismissible?=true }
InkSheet      { open, onClose, title, side?="bottom"|"right"|"left" }
```

### Hooks
```
useInkTheme(): InkTheme          // never throws; falls back to the default theme
useInkToast(): { show, dismiss } // no-ops without a provider
useInkBudget(): { spent, max } | null
usePrefersReducedMotion()  (react)   useReduceMotion()  (native)
```

---

## 6. Rules the API enforces

An agent writing Ink code should expect these and not fight them.

1. **No `color` prop exists on any component.** Colour comes from
   `tone: "neutral"|"brand"|"success"|"warning"|"danger"|"info"`. A test fails
   the build if a `color` prop appears. If none of the six fits, the answer is
   no colour, not a new one.
2. **`InkSpinner` requires `label`.** Prefer `InkMeter` when a total is known
   and `InkSkeleton` when the shape is known.
3. **Enumerated values are not typed.** Use `InkSegmented` (few options) or
   `InkSelect` (many). `InkInput` is for names, phrases and search.
4. **`InkSwitch` applies on flip; `InkCheckbox` is submitted with a form.**
   A switch behind a Save button is a checkbox wearing the wrong clothes.
5. **`InkDialog`/`InkSheet` require `title`.** It is the accessible name.
6. **`InkNavbar` is chrome and never carries the edge.** It gets glass.
7. **`InkChoice` marks selection by elevation, not colour.** There is no
   `selectedColor`.
8. `InkBudget` is opt-in. Wrap a screen in it to be warned (dev only) when more
   than `max` raised surfaces mount.

---

## 7. Driving the CSS without React

Classes and attributes the stylesheet reads, for a non-React binding.

```
.ink-edge                     the printed edge
.ink-edge--flat               hairline, no plate
.ink-edge--reserve            reserve the plate's 4px in layout
.ink-card .ink-group .ink-row .ink-field .ink-stack .ink-divider
.ink-pressable                adds the lift ladder (hover 7px, press 0)
.ink-pressable--compact       shorter throw for small controls
.ink-choice  .ink-choice--tile|--pill    + aria-pressed / aria-checked
.ink-btn .ink-btn--primary|--quiet|--danger  .ink-btn--block
.ink-switch + aria-checked    .ink-checkbox + data-state="on|off|mixed"
.ink-input .ink-textarea .ink-select .ink-slider
.ink-tabs .ink-tabs__tab + aria-selected
.ink-meter > .ink-meter__fill + data-indeterminate
.ink-notice .ink-badge  + --ink-tone-fg / --ink-tone-soft inline
.ink-glass                    the derived tint + blur + rim
.ink-navbar__slot[data-variant] > .ink-navbar[data-stage][data-material]
  .ink-navbar__body .ink-navbar__puck .ink-navbar__title .ink-navbar__action
.ink-reach                    vertical-only hit expansion
```

`--ink-lift` is the live edge offset. Set it on an element to move that
element's face; the plate never moves.

---

## 8. Cross-platform differences (all four)

| | React | React Native |
|---|---|---|
| hover | `raised` rung exists | never reached — a finger has no hover |
| edge layout cost | none (a shadow); opt in with `reserve` | always 4px (a real view) |
| hit expansion | `.ink-reach` pseudo-element | `hitSlop={{top,bottom,left:0,right:0}}` |
| title italic | real oblique | `skewX` unless a true italic is loaded |
| navbar stage | derived from a scroll listener | passed in from `onScroll` |

---

## 9. Common tasks

**Theme an app and let existing CSS pick it up**
```tsx
<InkProvider mode="global" scheme={dark ? "dark" : "light"} accent="Teal">
```

**A collapsing glass bar**
```tsx
<InkNavbar title="Settings" collapse
  actions={[{ key: "new", label: "New", primary: true, onPress: create }]} />
```

**Check a runtime colour before using it**
```ts
import { readable, passes } from "@jarida/ink";
const safe = passes(userColour, theme.color.surface, "text")
  ? userColour
  : readable(userColour, grounds(theme.color), "text");
```

**Emit the tokens at build time**
```ts
import { cssBlock, createTheme } from "@jarida/ink";
fs.writeFileSync("tokens.css",
  cssBlock(createTheme()) + "\n" + cssBlock(createTheme({ scheme: "dark" }), ':root[data-theme="dark"]'));
```

---

## 10. What is deliberately absent

Do not add these; they were considered and refused. See
[INVENTORY.md](./INVENTORY.md).

- **Tooltip** — hover-only and long-press are not one component. Use
  `InkRow`'s `description`.
- **Popover / dropdown menu** — needs a portal and a positioning engine React
  Native lacks. Use `InkSheet`.
- **Grid** — CSS Grid and Flexbox-only native share no model. Use `InkStack`.
- **Date picker, charts, rich text, tree** — not design-system components.
- **Icons** — `lucide-react` and `lucide-react-native` already agree; pass them
  as nodes.
