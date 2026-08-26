# Glass

The second material, and the only one allowed on chrome.

---

## Why a system built on printed paper has a glass in it

The rule is that **the edge marks content, never chrome**. Cards wear the 2px border and the hard
plate because they are what the screen is for; toolbars, filters and navigation stay quiet, or
nothing on the page is loud any more.

That leaves a question the ink material never answered: what *is* a navigation bar made of? A flat
opaque strip works until content scrolls beneath it, at which point it stops being a layer and
becomes a lid. Apple's answer in Liquid Glass is a material that refracts what is behind it so you
keep your sense of place while the bar stays legible. That instinct is right for chrome, and it does
not compete with the edge, because it is not trying to say *this is important* — it is trying to say
*this is above*.

So glass is admitted, on three conditions.

---

## 1. The tint is derived, not chosen

The standing criticism of Liquid Glass is that contrast falls below AA over a busy backdrop. It is a
fair criticism, and it is a solvable one.

A glass panel is `alpha` of its own surface over an unknown backdrop. There is a **minimum alpha** at
which its label clears 4.5:1 no matter what is behind it, and that number is computable — so it is
computed:

```ts
const glass = glassSurface(theme);
glass.alpha;      // 0.497 on the light theme
glass.worstCase;  // 4.51 — the ratio measured at the binding extreme
```

On light that lands near **0.497**; on dark, **0.638**. Noticeably more opaque than the glass in a
marketing shot. That is not timidity — it is what "legible over anything" actually costs, and the
honest move is to show the number rather than the shot.

Tell it what the backdrop can be and it earns transparency back:

```ts
glassSurface(theme, { over: [theme.color.bg, theme.color.content] });
```

There is a second floor, `minAlpha`, and it is a different kind of floor. Over the app's own warm
page, charcoal already measures 16:1, so the legibility derivation correctly returns zero — a bar
that is perfectly readable and completely invisible. Legibility says how opaque it *must* be; the
aesthetic floor says how opaque it must be to look like a layer at all.

## 2. The guarantee does not depend on the blur

Worth stating, because it is what makes the derivation sound rather than decorative.

Blurring the backdrop averages it, and an average can only lie **between** the extremes the
derivation already bounded — black and white. So the floor holds whatever the blur radius is,
whatever is behind it, and on a platform that cannot blur at all.

**The blur is a look. The alpha is the contract.** A test walks twenty greys between the extremes
and asserts every one of them clears.

## 3. It degrades to paper

`prefers-reduced-transparency` on the web, and `AccessibilityInfo.isReduceTransparencyEnabled()` on
native, turn the glass into a solid surface. Nothing is lost but the effect, because the tint was
already carrying the legibility — the solid version measures better, not worse.

---

## What is actually implemented, and what is not

Reproducing Liquid Glass properly means **refraction**: bending the content behind the panel rather
than scattering it. In a browser that is an SVG `feImage` + `feDisplacementMap` chain fed a
displacement map whose red and green channels encode per-pixel offsets, driven through
`backdrop-filter: url(#filter)`.

**Only Chromium supports an SVG filter in `backdrop-filter`.** Safari and Firefox do not.

That decides it for a library rather than a demo. Anything shipping through a system WebView —
every Tauri app, every Electron app on macOS, every embedded panel — is running **WKWebView or
WebKitGTK**, not Chromium, so a refraction implementation would be dead code in exactly the places
this material is most wanted. Rebuilding a displacement map on every resize is also real per-frame
cost, which matters most on the low-powered hardware that tends to be behind those WebViews.

So the web implementation is three progressive steps, and nothing depends on the top one:

| | What | Where |
|---|---|---|
| 1 | The derived tint alone | Everywhere, including older and embedded WebViews |
| 2 | `backdrop-filter: blur() saturate()` | Chrome, Safari, Firefox, and modern system WebViews |
| 3 | SVG displacement refraction | Chromium only — not implemented, and named here so nobody assumes it is missing by accident |

The **specular edge** is implemented at step 1: two inset hairlines, a light one along the top where
light would catch and a darker one along the bottom, so the bar reads as a piece with thickness
rather than a rectangle of fog. It does not track a light source, because a web page has no
gyroscope and a desk-mounted panel has no reason to.

### On native

React Native cannot blur what is behind a view. There is no `backdrop-filter` and no way to add one
— it is a compositor capability, not a style. The usual answer is `expo-blur`, which is a real
native blur and a real extra dependency, so this library does not take it on a consumer's behalf:

```tsx
import { BlurView } from "expo-blur";
<InkNavbar title="Settings" blurComponent={BlurView} />
```

Without it the bar renders the derived tint alone. That is a translucent bar rather than a glass
one, and it is **exactly as readable** — the tint was never the decoration.

---

## The scroll edge

At the top of a page the bar is nothing: transparent, no rule, no shadow. The moment content passes
under it, the material asserts itself. Worth copying for a reason that is not fashion — an always-on
bar spends contrast before it has anything to separate, and a bar that *appears* tells you there is
something above you.

The decision itself is in `@jarida/ink/headless`: `nextStage` takes the current stage and a scroll
reading and returns a stage, with hysteresis so entering a stage and leaving it use different
thresholds. A reader resting on a boundary — trackpad inertia, a thumb on a rubber-banding list —
would otherwise make the bar strobe.

On the web the reading comes from a scroll listener coalesced to one per animation frame. Running
the logic on every event runs it dozens of times per frame on a trackpad, and the state machine's
answer cannot change more than once per paint anyway.

It starts **expanded**, and the first reading corrects it. The other way round is the obvious way
round and it is wrong: any environment where the listener never fires leaves a bar that is either
invisible or collapsed to a button, with nothing to indicate why. The expanded bar is the most
navigable one, so that is what a missing signal falls back to.

React Native has no window to listen to, so there the stage is passed in from the list's `onScroll`.
Same prop, same meaning, different derivation — stated rather than hidden behind two components.

### Collapsing to a single button

The last stage shrinks the bar to one control. Pressing it **expands the bar** and does not fire the
action underneath: the reader collapsed it by scrolling, not by choosing to, so the first press is
them asking to see their options again. An action that fires from a control whose label has been
animated away is an action nobody agreed to.

The morph is one animated property. The bar sits in an end-aligned slot and its `max-width`
interpolates down to a single control, which produces the shrink and the slide together — no
keyframes, no measuring, and correct at any width. Everything else cross-fades, with `visibility`
following opacity on a delay so a faded-out control is not still clickable.

---

*Sources: [Apple Newsroom, June 2025](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/) ·
[Meet Liquid Glass, WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/) ·
[Liquid Glass in the Browser, kube.io](https://kube.io/blog/liquid-glass-css-svg/) ·
[Liquid Glass and accessibility](https://designedforhumans.tech/blog/liquid-glass-smart-or-bad-for-accessibility)*
