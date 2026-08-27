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
| `@jarida/ink/sweep` | build-time icon-name check | `node:fs` |

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

Then write markup with the documented classes and `data-` attributes (§8). The
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
titlePlacement(stage): "below" | "in-bar"
new NavbarBehaviour(config?)   // .scrolled(y) .current() .set(s) .subscribe(fn) .configure(c)
NAVBAR_DEFAULTS = { condenseAt: 24, collapseAt: 220, hysteresis: 32, revealAfter: 8, enabled: true }

// Navigation shape
fitBar(items, width): { shown, overflow, iconsOnly }   // caps at BAR_MAX (5)
shapeFor(width): "bar" | "rail" | "sidebar"            // <640, <1024, else
badgeText(badge): string | null                        // 0/false -> null, >99 -> "99+"

// Calendar — civil dates, never `Date`
monthGrid(year, month, opts): CalendarCell[][]   // always 6 weeks
addDays / addMonths / dayOfWeek / daysInMonth / isLeapYear / compareDates / isSameDay
moveFocus(date, key): CivilDate | null           // arrows, Page, Home/End
timeOptions(stepMinutes): CivilTime[]            // step must divide 1440
formatTime(time, hour12?): string
toCivilDate(Date) / fromCivilDate(civil, time?)

// Table
nextSort(current, key): SortState | null   // asc -> desc -> UNSORTED
ariaSort(current, key): "ascending" | "descending" | "none"
sortRows(rows, sort, valueOf): Row[]       // stable, nullish last, natural order

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
- A bottom bar caps at 5; past that the **last slot becomes overflow**, it does
  not squeeze. Labels come off on *label* width (72pt/slot), not target width.
- `monthGrid` is always **six weeks**, so nothing under it jumps when paging.
- The sort cycle is **three states**: ascending, descending, back to unsorted.
- `nextSort` on a new column always starts ascending.

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
InkRangeSlider { value: [number, number], onChange, min?, max?, step?, label, format? }
InkRadioGroup  { label, value, options[{value,label,description?,disabled?}], onChange }
InkMenu        { label, trigger, items[{key,label,icon?,onPress?,tone?,separated?}], align? }
```

**`InkRadioGroup` vs `InkSegmented`** — not a look, a question. A segment is for
values that fit on a line; a radio is for choices that need explaining. Wanting a
description on a segment means you wanted a radio group.

**`InkMenu` vs `InkSelect`** — a menu is for *actions*, a select is for *values*.
`InkSelect` uses the platform's own picker and is better at every part of it.

### Dates and time
```
InkCalendar        { value?, onChange?, range?, onRangeChange?, today?, min?, max?,
                     isDisabled?, weekStartsOn?=1, label? }
InkDatePicker      { label, value, onChange, placeholder?, format?, ...InkCalendar }
InkDateRangePicker { label, value: {start,end}, onChange, ...InkCalendar }
InkTimePicker      { label, value, onChange, step?=15, hour12?=false }
```

Values are **civil dates**, not `Date`: `{ year, month (1-12), day }` and
`{ hour (0-23), minute }`. Convert at the edge with `toCivilDate` /
`fromCivilDate`. Never do day arithmetic on a timestamp — use `addDays`,
`addMonths`, `monthGrid` from `@jarida/ink/headless`.

### Chat
```
InkBubble      { mine?, position?="only"|"first"|"middle"|"last", author?, meta?, status? }
InkBubbleGroup { label, messages[{id,mine?,author?,text,meta?,status?}] }
InkTyping      { author? }
```

Prefer `InkBubbleGroup`. It computes each bubble's `position` from the run, and
"is this the last message from this person" is exactly what a caller gets right
on first render and wrong after an insert.

### Forms
```
InkForm      { label, errors[{field,message}], onSubmit?, actions? }
InkFormField { id, label, hint?, error?, required? }
```

`InkForm` is a layout and an error summary, not a validation library. The summary
takes focus when errors appear and links each one to its field.

### Navigation
```
InkNavbar { title?, largeTitle?=false, lead?, trail?, actions?,
            variant?="sticky"|"floating"|"static",
            material?="auto"|"always"|"never", collapse?=false, collapsedBadge?,
            behaviour?, stage?, onStageChange?, scrollTarget? (react),
            topInset?, blurComponent? (native) }
InkBottomBar  { label, items, value, onChange, moreLabel?, moreIcon?, onMore?, bottomInset? (native) }
InkSidebar    { label, sections[{label?,items}], value, onChange,
                variant?="sidebar"|"rail", header?, footer?, onToggle? }
InkNav        { width, shape?, ...InkSidebar|InkBottomBar }   // picks by width
InkTabs       { label, value, tabs[{value,label,badge?,disabled?}], onChange }
InkBreadcrumb { items[{label,onPress?}], max?=4 }
```

A destination is `{ key, label, icon?, badge?, disabled? }`. `badge` is a number
or `true`; **0 and false render nothing**, and anything over 99 becomes `99+`.

### Feedback & data
```
InkNotice     { tone?, icon? }
InkMeter      { value?, label }          // omit value -> indeterminate
InkBadge      { tone?, icon? }
InkSpinner    { label, size?=18 }        // label is REQUIRED
InkProgress   { value?, label, size?=36, thickness?=3 }   // ring; omit value -> indeterminate
InkDots       { label }                  // the smallest loader
InkSkeleton   { width?, height?=14, radius?, shimmer?=false }
InkEmptyState { icon?, title, action? }
InkAvatar     { name, src?, size?=32 }
InkToaster    { }                        // wrap the app; useInkToast() to show
InkTable      { caption, columns[{key,header,numeric?,render,width?,sortable?,sortValue?}],
                rows, rowKey, empty?, sort?, onSortChange?, sticky? }
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

## 6. Icons — `icon="search"`

Every `icon` prop takes a **name** or an element. Names work identically on both
platforms.

```tsx
<InkButton icon="search">Find</InkButton>
<InkIcon name="bell" label="Notifications" size={24} />
```

**Setup, once, at the entry point.** Ink cannot depend on lucide: it is two
packages (`lucide-react`, `lucide-react-native`) and neither runs where the
other does. So you inject the set.

```ts
import { registerIcons } from "@jarida/ink";
import { Search, Bell } from "lucide-react";      // or "lucide-react-native"
registerIcons({ Search, Bell });
```

**Register named imports, not the namespace.** Measured, gzipped: 3 named
imports 1.2 KB, a 40-icon object literal 3.9 KB, the whole `icons` namespace
133.8 KB. A bundler cannot shake a set indexed by a variable. Metro does not
shake at all.

**Names are canonicalised on both sides.** `Search`, `SearchIcon`,
`LucideSearch`, `search`, `Search Icon`, `search_icon` → one key. A second
lookup ignores hyphenation, covering the 32 lucide names whose export and
filename disagree (`ArrowDownAZ` ↔ `arrow-down-a-z`).

**18 names always resolve**, with nothing installed: `menu` `x` `check`
`chevron-down` `chevron-up` `chevron-left` `chevron-right` `ellipsis` `plus`
`minus` `search` `arrow-left` `arrow-right` `circle` `info` `triangle-alert`
`star` `loader-circle`.

**Size is derived, stroke is compensated.**

```ts
controlIconSize("sm" | "md" | "lg")   // 16 | 20 | 24  = round(height * 0.45) on the 4px grid
iconStrokeWidth(size)                 // 2 * 24 / size — every size renders a 2px line
```

**No colour prop.** An icon takes surrounding text colour, or its container's
tone via `var(--ink-tone-fg, currentColor)`. Pass `tone` to set one.

**Decorative by default.** `aria-hidden` + `focusable="false"` on web;
`accessibilityElementsHidden` *and* `importantForAccessibility` on native (both,
or it doubles labels on one OS). `label` opts in to `role="img"`.

**Failure is loud in dev, safe at runtime.** An unresolved name renders a
reserved box of the exact icon size — never the name as text — outlined in dev.
`resolveIcon` returns `ok` / `bare` (nothing registered) / `unknown` (with a
suggestion), and warnings fire once per message.

**Icon data on React Native** needs a renderer, handed over once:

```ts
import * as Svg from "react-native-svg";
configureIconPrimitives(Svg);
```

Only needed for geometry (the house set, or a set from `lucide-static`).
Registered components bring their own renderer.

**CI check** — `sweepIconNames(dir, known)` from `@jarida/ink/sweep` reads source
for literal names nothing will answer. Skips `*.test.*` and comments; ignores
non-literals.

**Do not** call `renderIconSlot` from a hook position — it is a plain function on
purpose, because icons render inside `.map()` over ResizeObserver-derived lists.

Full detail: [ICONS.md](ICONS.md).

---

## 7. Rules the API enforces

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

## 8. Driving the CSS without React

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

## 9. Cross-platform differences (all four)

| | React | React Native |
|---|---|---|
| hover | `raised` rung exists | never reached — a finger has no hover |
| edge layout cost | none (a shadow); opt in with `reserve` | always 4px (a real view) |
| hit expansion | `.ink-reach` pseudo-element | `hitSlop={{top,bottom,left:0,right:0}}` |
| title italic | real oblique | `skewX` unless a true italic is loaded |
| navbar stage | derived from a scroll listener | passed in from `onScroll` |

---

## 10. Common tasks

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

## 11. Against Material UI

A component-by-component map is in [MUI-MAP.md](./MUI-MAP.md) — useful as a
migration table and as a check that nothing obvious is missing. Where the two
differ it is because Ink must run unchanged on React Native, or because MUI's
component was doing two jobs and Ink split it (Text Field into input / textarea
/ search; Typography by job rather than by tag; Progress into bar / ring /
spinner / dots).

## 12. What is deliberately absent

Do not add these; they were considered and refused. See
[INVENTORY.md](./INVENTORY.md).

- **Tooltip** — hover-only and long-press are not one component. Use
  `InkRow`'s `description`.
- **Grid** — CSS Grid and Flexbox-only native share no model. Use `InkStack`.
- **Charts, rich text, tree** — not design-system components.
- **Icons** — `lucide-react` and `lucide-react-native` already agree; pass them
  as nodes.

`InkMenu` and the date pickers used to be on this list. They are now in, with
the platform difference stated rather than papered over: the menu is an anchored
popover on the web and a sheet on native, and so are the pickers. A popover
attached to a button ends up under the thumb that opened it.
