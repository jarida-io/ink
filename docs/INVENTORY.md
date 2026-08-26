# The inventory

Every element a design library is expected to have, and where Ink stands on each.

Two columns of judgment. **Shipped** is in the library, exported from both renderers, and covered by
the parity test in `src/packaging.test.ts` that fails if one platform gains a component the other
does not.
**Deliberately out** is the interesting column: a library that pretends to cover everything is a
library that ships something broken on one platform, and naming what is missing is more useful than
half-building it.

The rule that decides the third column: **every component here exists on both platforms with the
same props.** Anything that cannot be is not in the library — it is a note in this file explaining
why, so the next person does not spend a day rediscovering it.

---

## Foundations

| | Status | Notes |
|---|---|---|
| Design tokens | **Shipped** | One resolved object per theme. No references — the platform that cannot follow one is the one this exists to reach |
| Colour scales + semantic tones | **Shipped** | Six tones, closed set. There is no `color` prop anywhere |
| Typography scale | **Shipped** | Three roles, per-weight family resolution for native |
| Spacing / radius / elevation | **Shipped** | 8pt grid, the ink ladder |
| Motion tokens | **Shipped** | One curve, four durations, reduced-motion collapses rather than removes |
| Theming (light/dark/accent/density) | **Shipped** | `createTheme`, three provider modes |
| Contrast utilities | **Shipped** | WCAG maths, `readable()`, `bestOn()`, `assertContrast()` |
| Icons | **Deliberately out** | `lucide-react` on web and `lucide-react-native` on native already agree. Wrapping them would add a layer whose only job is to be in the way |

## Layout

| | Status | Notes |
|---|---|---|
| `InkCard` | **Shipped** | The edge, around content |
| `InkGroup` | **Shipped** | One card holding rows |
| `InkRow` | **Shipped** | Label, description, control |
| `InkStage` | **Shipped** | Quiet inset, no plate |
| `InkDivider` | **Shipped** | Hairline or ink, horizontal or vertical, optional label |
| `InkStack` | **Shipped** | The one layout primitive worth having: gap from the scale, direction, wrap |
| Grid | **Deliberately out** | CSS Grid and Flexbox-only React Native do not have a shared model. A grid component would be two different components wearing one name |

## Navigation

| | Status | Notes |
|---|---|---|
| `InkNavbar` | **Shipped** | The glass bar. See [GLASS.md](./GLASS.md) |
| `InkTabs` | **Shipped** | Roving tabindex on web, accessible tablist on both |
| `InkSegmented` | **Shipped** | Radio group of choices — for values, where tabs are for views |
| `InkBreadcrumb` | **Shipped** | Truncates from the middle, because the ends are the parts that mean anything |
| `InkBottomBar` | **Shipped** | The phone shape. Caps at five and overflows the rest rather than squeezing |
| `InkSidebar` | **Shipped** | And the rail: one component, because a rail is a sidebar with its labels off |
| `InkNav` | **Shipped** | Picks a shape from a container width, not a media query |

| Pagination | **Deliberately out** | An application concern: the page size, the URL shape and the loading strategy are all product decisions |

## Controls

| | Status | Notes |
|---|---|---|
| `InkButton` | **Shipped** | `primary` / `quiet` / `danger` |
| `InkChoice` | **Shipped** | Elevation as the only channel that says *chosen* |
| `InkSwitch` | **Shipped** | Only where the change applies on flip |
| `InkCheckbox` | **Shipped** | With an indeterminate state, which a switch cannot have |
| `InkInput` | **Shipped** | One line. `InkField` was already the label-and-reading wrapper |
| `InkTextArea` | **Shipped** | Auto-growing, capped |
| `InkSelect` | **Shipped** | The platform's own picker, in the house material |
| `InkSlider` | **Shipped** | Was out of v1. Now built on pointer events and `PanResponder`, so the ink thumb survives the port |
| `InkDatePicker` | **Shipped** | Civil dates, never a `Date`. Popover on the web, sheet on native |
| `InkDateRangePicker` | **Shipped** | Two presses; a third starts over rather than extending ambiguously |
| `InkTimePicker` | **Shipped** | A list at a step, not three spinners |
| `InkRadioGroup` | **Shipped** | For choices that need explaining. A segment is for values that fit on a line |
| `InkRangeSlider` | **Shipped** | Two thumbs that clamp rather than swap |
| Rich text editor | **Deliberately out** | Not a design-system component |

## Feedback

| | Status | Notes |
|---|---|---|
| `InkNotice` | **Shipped** | Says what happened, not that something did |
| `InkMeter` | **Shipped** | Paces rather than inventing a percentage |
| `InkBadge` | **Shipped** | A fact, set in mono |
| `InkSpinner` | **Shipped** | Requires a label. A spinner that cannot say what it is waiting for is a spinner that is lying |
| `InkSkeleton` | **Shipped** | The shape of the content before the content, so the layout does not jump |
| `InkEmptyState` | **Shipped** | An invitation to act, not a mood |
| `InkToast` | **Shipped** | Queue, live region, and a duration that scales with how long the message takes to read |
| `InkAvatar` | **Shipped** | Initials fallback, never a generated colour — that would invent meaning the data lacks |

## Overlays

| | Status | Notes |
|---|---|---|
| `InkDialog` | **Shipped** | Focus trap and restore on web, `Modal` on native, same props |
| `InkSheet` | **Shipped** | Edge-anchored: arrives from a direction, and a thumb can reach its top |
| Tooltip | **Deliberately out** | Hover-only on web and long-press on native is not the same component. Use `InkRow`'s description, which is always visible and always read aloud |
| `InkMenu` | **Shipped** | Anchored on the web, a sheet on native. For actions; `InkSelect` is for values |
| Command palette | **Deliberately out** | A product feature |

## Data

| | Status | Notes |
|---|---|---|
| `InkTable` | **Shipped** | Sortable and stickable. Scrolls in its own container, never the page |
| `InkBubble` | **Shipped** | Chat. The tail belongs to the run, not to every message |
| `InkBubbleGroup` | **Shipped** | Works out each bubble's place in the run so the caller cannot get it wrong |
| `InkForm` | **Shipped** | A layout and an error summary. Not a validation library |
| `InkProgress` | **Shipped** | A ring, for where a bar does not fit |
| `InkDots` | **Shipped** | The smallest loader |
| `InkList` | **Shipped** | `InkRow`s with dividers and an empty state, which is the shape 90% of tables actually wanted |
| Charts | **Deliberately out** | A charting library is a different library |
| Tree | **Deliberately out** | One product needed one once |

---

## What is left

Nothing above is a placeholder. The **Deliberately out** rows are the ones to re-read before adding
anything: each is a case where the honest answer was to name the gap rather than ship a component
that works on one platform and disappoints on the other.
