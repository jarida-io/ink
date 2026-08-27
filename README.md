# Ink

A design library with a printed edge and a glass bar.

**Zero runtime dependencies.** The tokens, the geometry, the accessibility maths
and the component *behaviour* have no framework in them at all — they run in a
browser, on a device, in a build script or in a plain `node -e`. React and React
Native are thin renderers on top, and the stylesheet drives any other framework
with no JavaScript whatsoever.

```bash
npm install @jarida/ink
```

---

## The idea

Two things, and everything else follows from them.

**The edge is a plate, not a shadow.** A card is a sheet with a 2px border,
printed 4px above a hard-offset plate. Choosing something raises it; pressing
drives it back down. Written the obvious way — an animated `box-shadow` — it is
a web-only trick. Modelled properly it turns out the plate never moves and only
the face does, which is two views, and two views exist on every platform.

**Colour that has to be legible is derived, not chosen.** The library ships the
WCAG maths, and the values that depend on a runtime accent are computed against
every ground they can land on. A user picking an accent cannot produce a focus
ring at 2.8:1, because the ring is not the accent — it is the nearest version of
the accent that clears the floor.

---

## Four layers

Each one depends only on the ones above it. You can stop at any of them.

| | | |
|---|---|---|
| `@jarida/ink` | tokens, geometry, contrast, glass | nothing |
| `@jarida/ink/headless` | navbar, roving focus, toasts, slider maths | nothing |
| `@jarida/ink/css` | the stylesheet | nothing |
| `@jarida/ink/react` · `/native` | components | react · react-native |

The middle two are what make this usable outside React. A Vue app, a Svelte app
or a vanilla page imports the headless behaviour and the CSS and gets the same
navbar, the same keyboard handling and the same toast timing as the React
bindings — because it is the same code, not a port of it.

---

## Getting started

### React

```tsx
import "@jarida/ink/css";
import { InkProvider, InkCard, InkTitle, InkButton } from "@jarida/ink/react";

export function App() {
  return (
    <InkProvider accent="Purple">
      <InkTitle>Settings</InkTitle>
      <InkCard pressable onPress={open}>
        <InkTitle level={3}>Voice</InkTitle>
      </InkCard>
      <InkButton variant="primary" onPress={save}>Save changes</InkButton>
    </InkProvider>
  );
}
```

`InkProvider` writes the tokens as CSS custom properties. Three modes:
`"scoped"` (default) puts them on a wrapper, `"global"` on `<html>` so existing
stylesheets pick them up, and `"context"` writes nothing for an app that already
applies them itself.

### React Native / Expo

```tsx
import { useFonts } from "expo-font";
import { Quicksand_400Regular, Quicksand_700Bold } from "@expo-google-fonts/quicksand";
import { InkProvider, InkCard, InkNavbar } from "@jarida/ink/native";
```

Load the fonts before rendering — `requiredNativeFonts()` lists exactly which.
Android ignores `fontWeight` on a runtime-registered family, so Ink resolves a
family name per weight for you.

### Vue, Svelte, Solid, or no framework

```js
import "@jarida/ink/css";
import { createTheme, cssVariables } from "@jarida/ink";
import { NavbarBehaviour, rove, ToastQueue } from "@jarida/ink/headless";

const theme = createTheme({ scheme: "dark", accent: "Teal" });
for (const [name, value] of Object.entries(cssVariables(theme))) {
  document.documentElement.style.setProperty(name, value);
}
```

Then write markup with the documented classes. The behaviour is in the headless
module; the appearance is in the CSS; neither needs React.

---

## The edge

The shipped form is a shadow whose offset changes plus a transform that
compensates. Work the arithmetic through:

| state | face at | plate at |
|---|---|---|
| rest | 0 | +4 |
| raised (hover) | −3 | −3 + 7 = **+4** |
| pressed | +4 | +4 + 0 = **+4** |

**The plate never moves.** That is the physical reading — a sheet lifting off a
printed mark and being pressed back onto it — and it is why the treatment ports.

- **Web** keeps the shadow form. It costs no extra element.
- **Native** draws the plate as an absolutely positioned sibling, sized so
  nothing ever overflows its container. Not because React Native cannot do
  `boxShadow`, but because two views are the honest model, render identically on
  every version, and reserve their own space in layout.

---

## Glass

A second material, for chrome. The standing criticism of translucent bars is
that contrast falls below AA over a busy backdrop — fair, and solvable: there is
a **minimum alpha** at which a panel's label clears 4.5:1 whatever is behind it,
so it is computed rather than picked.

```ts
const glass = glassSurface(theme);
glass.alpha;      // 0.497 light, 0.638 dark — over anything at all
glass.worstCase;  // 4.51 — the ratio measured at the binding extreme
```

More opaque than a marketing shot. That is what "legible over anything" costs.
Tell it what the backdrop can actually be and it earns transparency back.

The guarantee does not depend on the blur, which is what makes it sound: blurring
averages the backdrop, and an average lies *between* the extremes the derivation
already bounded. **The blur is a look; the alpha is the contract.**

Full argument, including why SVG refraction is deliberately not implemented, in
[docs/GLASS.md](docs/GLASS.md).

---

## The navbar

Three stages, driven by a pure state machine you can use without the component:

```
expanded    the whole bar, no material
condensed   material arrives, secondary actions go
collapsed   one button
```

```tsx
<InkNavbar title="Settings" collapse
  actions={[{ key: "new", label: "New", primary: true, onPress: create }]} />
```

Pressing the collapsed button **expands the bar** rather than firing the action
under it: the reader collapsed it by scrolling, not by choosing to, so the first
press is them asking to see their options again.

Hysteresis means entering a stage and leaving it use different thresholds, so a
reader resting on a boundary — trackpad inertia, a thumb on a rubber-banding
list — does not make the bar strobe. Any upward gesture returns it immediately,
without waiting to cross anything on the way back.

---

## Spacing and borders

Nothing here is a number somebody typed once.

**Control padding is derived from height:** `padX = round(height × 0.36)`,
snapped to the 4px grid. `32 → 12`, `44 → 16`, `52 → 20`. A pill takes one step
more, because a fully rounded corner eats side room. Container padding is a
*separate* scale, because the space around a group is not the space around a
word.

**There are two border widths: 1 and 2.** The 1.5px hairline is gone on purpose
— a fractional pixel resolves differently in every engine at 1x, which makes it
the one value in a design system that is not the same on two machines. If you
want heavier than a hairline, darken it rather than thickening it.

A test parses the stylesheet and fails on a raw pixel in any `padding`,
`min-height` or `border-radius`, and on any fractional border.

---

## What it enforces

Three rules the API holds rather than describes.

**No `color` prop exists.** Colour comes from a closed set of six tones, so you
name the meaning before you get the hue. A test asserts the prop does not exist.

**`InkSpinner` requires a label.** A spinner that cannot say what it is waiting
for is claiming progress it has no knowledge of.

**`InkBudget` counts raised surfaces.** Opt-in; warns in development when a
screen raises more than it allowed itself. A choice only counts while selected,
so a row of twelve options spends one edge, not twelve.

---

## Documentation

- **[docs/AGENTS.md](docs/AGENTS.md)** — the complete API in one dense file,
  written for coding agents. Also the fastest reference for a human in a hurry.
- **[docs/INVENTORY.md](docs/INVENTORY.md)** — every element, and the ones
  deliberately absent with the reason.
- **[docs/GLASS.md](docs/GLASS.md)** — the material, and what is not implemented.
- **[llms.txt](llms.txt)** — machine-readable summary.

---

## Four things that cannot be the same

Everything else behaves identically on both platforms. These four are the
platform, not a choice, and each is documented where it happens.

| | React | React Native |
|---|---|---|
| **Hover** | the `raised` rung exists | never reached — a finger has no hover |
| **Edge layout cost** | none; opt in with `reserve` | always 4px, because the plate is a real view |
| **Reach** | a pseudo-element | `hitSlop`, top and bottom only |
| **Title italic** | a real oblique | a `skewX` slant unless a true italic is loaded |

The escape hatch also differs: `className` on React, `style` on native.
Pretending otherwise would mean shipping a style system nobody asked for.

---

## Testing

```bash
npm run verify   # two type-checks, plus 266 tests
npm run build    # dist/ with declarations, plus the stylesheet
```

The native renderer is type-checked, not unit-tested: running it needs a React
Native runtime, and a shimmed one would be testing the shim.
`tsconfig.native.json` compiles without DOM types on purpose, so a `window`
reaching the shared tiers fails here rather than on a device.

A parity test asserts both renderers export the same names — the library's
central promise fails a build if it stops being true.

---

*Apache-2.0. Maintained by Jerry Ochieng Anyumba for the Jarida Open Source
Community.*
