# Icons

Name an icon in plain text. The same string works on the web and on device.

```tsx
<InkButton icon="search">Find</InkButton>
<InkListItem icon="arrow-right" />
<InkIcon name="bell" label="Notifications" />
```

Eighteen names resolve on a fresh install with nothing configured. Everything
else you register once, from whichever icon package your platform has.

---

## Why Ink does not depend on lucide

It cannot, and neither can any other cross-platform library.

Lucide ships as **two** packages. `lucide-react` renders `<svg>` and peers on
React. `lucide-react-native` renders `react-native-svg` primitives and peers on
React, React Native and `react-native-svg`. Neither runs on the other's
platform. A library that depends on one has stopped being cross-platform; a
library that depends on both cannot be installed.

So the **string is the contract** and the artwork is injected. Ink owns the
name, you own the icon set, and the call site is identical either way. That also
means lucide is not privileged: Material Symbols, Phosphor, Feather, or your own
drawings register through the same door.

---

## Setup

### Web

```tsx
import { registerIcons } from "@jarida/ink";
import { Search, Bell, Check, ArrowRight } from "lucide-react";

registerIcons({ Search, Bell, Check, ArrowRight });
```

### React Native / Expo

```tsx
import { registerIcons } from "@jarida/ink";
import { Search, Bell, Check, ArrowRight } from "lucide-react-native";

registerIcons({ Search, Bell, Check, ArrowRight });
```

Same function, same names afterwards. Only the import line differs, which is the
one line that genuinely has to.

### Registering data instead of components

Any set exported as geometry works too — `lucide-static`'s `icon-nodes.json`, or
your own:

```ts
import nodes from "lucide-static/icon-nodes.json";
registerIcons(nodes);            // 1777 names, keyed in kebab-case
registerIcons({ wave: [["path", { d: "M2 12h20" }]] });   // or one of your own
```

On the web that renders directly. On React Native, data needs a renderer, which
you hand over once:

```ts
import * as Svg from "react-native-svg";
configureIconPrimitives(Svg);
```

Most native apps never call this — registering `lucide-react-native` components
covers every icon they name, and those components bring their own renderer.
It is only needed for icons that arrive as geometry.

---

## Register what you use, not everything

`import { icons } from "lucide-react"` and handing over the whole namespace
works, and it is the right answer for an icon picker or a documentation site.
For an application it is a mistake, and a measured one. Vite 8 / rolldown,
minified, React external:

| what you register | raw | gzip |
| --- | ---: | ---: |
| three named imports | 2.3 KB | 1.2 KB |
| a 40-icon object literal | 10.7 KB | 3.9 KB |
| the whole `icons` namespace | 612.7 KB | 133.8 KB |

A bundler can only shake a set it can follow statically, and a namespace indexed
by a variable is not followable. Naming the icons in an object literal keeps it
analysable, so the literal costs what its members cost. The dynamic lookup then
happens on Ink's own `Map`, where it is free.

Metro does not tree-shake at all, so on React Native the middle row is the only
row.

---

## Names

`Search`, `SearchIcon`, `LucideSearch`, `search`, `Search Icon` and `search_icon`
are one name. Canonicalisation runs on the key you **register** and the name you
**write**, which is what lets an import (PascalCase) meet a call site (kebab).

```
Search        ->  search
SearchIcon    ->  search
LucideSearch  ->  search
arrowRight    ->  arrow-right
Arrow Right   ->  arrow-right
ALargeSmall   ->  a-large-small
Volume2       ->  volume-2
```

This is *not* "convert PascalCase to lucide's filename" — that conversion does
not exist. Lucide publishes both `Grid2x2` and `Grid2X2`, and it exports
`ArrowDownAZ` from a file called `arrow-down-a-z` while exporting `Clock12` from
one called `clock-12`. No single rule splits `AZ` and joins `12`.

Thirty-two of lucide's names sit on that fault line, so a second lookup ignores
hyphenation entirely. Measured over all 1768 distinct icons lucide publishes,
that resolves all 32 and collides with none.

### Autocomplete

`InkIconName` accepts any string, so nothing you write is ever a false error.
To get completions for your own set, derive them from the object you registered:

```ts
const ICONS = { Search, Bell, Check } as const;
registerIcons(ICONS);

declare module "@jarida/ink" {
  interface InkIconRegistry extends InkIconsFrom<typeof ICONS> {}
}
```

Derived, not written out, so the completions cannot drift from what is actually
registered.

The union stays **open** on purpose. Closing it against one version of one icon
set turns working code into a compile error the day that set updates, and a
false error is worse than none — it teaches a team to reach for `as any`, and
that channel never recovers. Typos are caught at dev time and in CI instead
(below), both of which also catch the case no type can: a name from data.

---

## Size and weight

Icon size is derived from the control's height, the same way padding is:

```
iconSize = round(height * 0.45) snapped to the 4px grid
32 -> 16      44 -> 20      52 -> 24
```

`lg` lands on 24 deliberately: that is the grid lucide draws on, the one size
where the artwork is untouched.

Stroke is compensated so every size carries the same weight:

```
strokeInViewBox = 2 * 24 / renderedSize
16 -> 3.00      20 -> 2.40      24 -> 2.00      48 -> 1.00
```

All of those render as **two device pixels**. Without it, a 24px drawing shown at
16px carries a 1.33px line; beside a 24px icon at 2px, one row of controls reads
the way a row of mismatched font weights would. This is what lucide's
`absoluteStrokeWidth` computes; Ink computes it directly, because the house set
is data and data has no flag to set.

## Colour

There is no colour prop. Tone names meaning; a hex does not.

An icon takes the colour of the text around it, and inside a toned container —
a chip, a badge, a notice — it picks up that container's tone on its own,
because the stroke reads `var(--ink-tone-fg, currentColor)`. Pass `tone` to set
one explicitly.

---

## Accessibility

**Icons are decorative by default.** An icon beside a word is a picture of that
word; announced, it reads "search search". So `InkIcon` is `aria-hidden` with
`focusable="false"`, and you opt *in* to meaning:

```tsx
<InkButton icon="search">Find</InkButton>          {/* hidden — the word is there */}
<InkIcon name="search" label="Search" />           {/* role="img", announced */}
```

On React Native, hiding takes **two** props: `accessibilityElementsHidden` (iOS)
and `importantForAccessibility="no-hide-descendants"` (Android). Ink sets both.
Setting one is the usual way this gets written, and it produces an icon that is
silent on the author's simulator and doubles every label on the other OS.

An icon-only control still needs its own label — that is the control's job, and
Ink's icon-only controls already require it.

---

## When a name does not resolve

Three outcomes, not two, because "you have not set this up" and "that name is
wrong" have different fixes:

| state | what you get |
| --- | --- |
| resolved | the icon |
| nothing registered | a warning with a copy-pasteable setup snippet |
| registered, name unknown | `no icon named "serach". Did you mean "search"?` |

Whatever the cause, the rendered result is the same: **a reserved box of exactly
the icon's size**, so correcting a name never reflows the row around it. In
development it is outlined in the destructive colour, because a console warning
scrolls away and a red box does not.

It never renders the name as text. That fallback is tempting and it means a
typo, a stale bundle, or two copies of the package in a monorepo all ship the
raw word "search" into production UI, where it reads as finished work.

Warnings fire once per message, not once per row.

---

## Catching typos in CI

```ts
import { sweepIconNames } from "@jarida/ink/sweep";
import { registeredIconNames } from "@jarida/ink";

registerIcons(ICONS);
const misses = sweepIconNames("src", registeredIconNames());
for (const m of misses) console.error(`${m.file}:${m.line}  ${m.detail}`);
process.exit(misses.length ? 1 : 0);
```

It reads the source rather than the types, so it catches three things a type
never could: a JavaScript caller, a call site that reached for `as any`, and a
literal name sitting in a data file.

It skips `*.test.*` by default and ignores names inside comments — a check with
known-good failures in it is a check people learn to switch off. It does not
flag `icon={row.iconName}`: a variable has no value at build time, and warning
on every correct dynamic call site is the fastest way to get the check disabled.

`@jarida/ink/sweep` is a separate entry point because it uses `node:fs`.
Importing it from an app bundle would pull Node into a browser build.

---

## The house set

Eighteen names always resolve, with nothing installed:

```
menu      x          check       chevron-down   chevron-up   chevron-left
chevron-right        ellipsis    plus           minus        search
arrow-left           arrow-right circle         info         triangle-alert
star      loader-circle
```

These are the glyphs Ink needs for its own chrome, and they used to be drawn by
hand in CSS — a hamburger built from three `<span>`s, an overflow control from
three more, a rating ring from a border. Hand-drawn chrome is why a hamburger
and a chevron never quite matched: they were made by different means, on
different grids, months apart.

The geometry is lucide's, on lucide's 24×24 grid, so the house set and a
registered lucide set are the same drawing at the same weight. It uses only
`path` and `circle`, which is what keeps the React Native renderer down to two
primitives. Eighteen icons of path data is 1622 bytes; paying a dependency for
that would cost more than it saves.

> Icon geometry from [Lucide](https://lucide.dev), ISC License. Portions
> copyright Cole Bemis 2013–2022 as part of Feather (MIT); all other copyright
> held by Lucide Contributors 2022.

---

## API

| export | what it does |
| --- | --- |
| `InkIcon` | draws a named icon — `name`, `size`, `tone`, `strokeWidth`, `label` |
| `registerIcons(set)` | adds components and/or data to the registry |
| `configureIconPrimitives(svg)` | hands React Native a renderer for icon data |
| `renderIconSlot(slot, size?)` | what every component calls; string or element |
| `normalizeIconName(name)` | the canonical key for any spelling |
| `resolveIcon(name)` | `ok` / `bare` / `unknown`, with a suggestion |
| `registeredIconNames()` | every name that currently resolves |
| `resetIcons()` | drops registrations, keeps the house set |
| `controlIconSize(size)` | the derived icon size for `sm` / `md` / `lg` |
| `iconStrokeWidth(size)` | the compensated stroke for a rendered size |
| `sweepIconNames(dir, known)` | from `@jarida/ink/sweep`; build-time name check |

`registerIcons` is a function you call, not an import with a side effect. This
package declares `sideEffects: ["*.css"]`, so a module that registered on import
could legally be dropped by a bundler — and the symptom would be icons that work
in development and vanish in production.
