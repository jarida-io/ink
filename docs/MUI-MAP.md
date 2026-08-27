# Ink against Material UI

Every component MUI lists, and where Ink stands on it. Useful two ways: as a
migration map, and as a check that nothing obvious is missing.

Ink is **not** trying to be MUI. Where the two differ it is because Ink has to
run unchanged on React Native, or because the component was doing two jobs and
Ink split it. Those are marked.

---

## Inputs

| MUI | Ink | |
|---|---|---|
| Autocomplete | `InkAutocomplete` | Ranks prefix > word-start > mid-word, so "se" offers Settings before Voice sensitivity |
| Button | `InkButton` | Three variants; about one `primary` per screen |
| Button Group | `InkButtonGroup` | Presentational only — a group of actions has no selection |
| Checkbox | `InkCheckbox` | With the indeterminate state a switch cannot have |
| Floating Action Button | `InkFab` | Wears the edge: a fab is content, not chrome |
| Number Field | `InkNumberField` | `type="text"` + numeric keypad, never `type="number"` |
| Radio Group | `InkRadioGroup` | For choices that need explaining |
| Rating | `InkRating` | A radio group wearing marks, which is what a rating is |
| Select | `InkSelect` | The platform's own picker; a sheet on native |
| Slider | `InkSlider`, `InkRangeSlider` | Range ends clamp rather than swapping |
| Switch | `InkSwitch` | Only where the change applies on flip |
| Text Field | `InkInput`, `InkTextArea`, `InkSearchField` | **Split.** MUI's one component is three questions |
| Toggle Button | `InkChoice` | Elevation marks selection, never colour |
| Transfer List | — | **Out.** Two `InkList`s and two buttons; not a primitive |

## Data display

| MUI | Ink | |
|---|---|---|
| Avatar | `InkAvatar`, `InkAvatarGroup` | Never a colour derived from the name |
| Badge | `InkBadge`, and the nav badge | **Split.** A label you read vs a count on a control |
| Chip | `InkChip` | Pressable and removable; the remove control is separate |
| Divider | `InkDivider` | Hairline or ink, with an optional label in the rule |
| Icons | — | **Out.** `lucide-react` and `lucide-react-native` already agree |
| List | `InkList`, `InkListItem` | A record — lead, two lines, trail. `InkRow` is a setting |
| Table | `InkTable` | Sortable through **three** states, stickable header |
| Tooltip | `InkTooltip` | Hover+focus on web, long-press on native. Never put anything needed in one |
| Typography | `InkText`, `InkTitle`, `InkEyebrow`, `InkProse` | **Split** by job rather than by tag |

## Feedback

| MUI | Ink | |
|---|---|---|
| Alert | `InkNotice` | Danger announces; everything else waits to be read |
| Backdrop | `InkBackdrop` | Requires a label — a blocking wait with no explanation is the worst state |
| Dialog | `InkDialog` | The platform `<dialog>`: focus trap, Escape and top layer for free |
| Progress | `InkMeter`, `InkProgress`, `InkSpinner`, `InkDots` | **Split.** Bar, ring, indeterminate, inline |
| Skeleton | `InkSkeleton` | Still by default; the shimmer costs frames |
| Snackbar | `InkToaster` | Duration scales with reading time; danger never auto-dismisses |

## Surfaces

| MUI | Ink | |
|---|---|---|
| Accordion | `InkAccordion` | Built on `<details>`, so find-in-page reaches inside a closed panel |
| App Bar | `InkNavbar` | Three stages, glass, contracts to a button |
| Card | `InkCard`, `InkGroup` | `InkGroup` is one card holding rows, not one card per row |
| Paper | `InkSurface` | The fill and the radius, with no edge |

## Navigation

| MUI | Ink | |
|---|---|---|
| Bottom Navigation | `InkBottomBar` | Caps at five and overflows the rest |
| Breadcrumbs | `InkBreadcrumb` | Truncates from the middle |
| Drawer | `InkDrawer`, `InkSidebar presentation="overlay"` | The scrim is a real button |
| Link | `InkLink` | Underlined by default; colour alone is not a marker |
| Menu | `InkMenu` | Anchored on web, a sheet on native. For actions; `InkSelect` is for values |
| Pagination | `InkPagination` | Constant width wherever the page is |
| Speed Dial | `InkSpeedDial` | A fab that opens a handful of actions |
| Stepper | `InkStepper` | Back is always allowed; forward is the product's call |
| Tabs | `InkTabs` | For *views*. `InkSegmented` is for *values* |

## Layout

| MUI | Ink | |
|---|---|---|
| Box | — | **Out.** A styled div is the framework's job |
| Container | `InkContainer` | Four widths, prose capped for reading |
| Grid | — | **Out.** CSS Grid and Flexbox-only native share no model |
| Stack | `InkStack` | Gaps from the scale |
| Image List | — | **Out.** A layout, not a component |

## Lab

| MUI | Ink | |
|---|---|---|
| Timeline | `InkTimeline` | An `<ol>`, because a timeline is a sequence |
| Masonry | — | **Out.** Needs measurement; a layout rather than a component |

## Utils

MUI's utils are React plumbing rather than design-system components, and Ink
does not reimplement them: Click-Away Listener, CSS Baseline, Modal, No SSR,
Popover, Popper, Portal, Textarea Autosize, Transitions, useMediaQuery.

Two are covered where they matter: `InkTextArea` grows like Textarea Autosize,
and `InkDialog`/`InkSheet`/`InkDrawer` handle their own presentation instead of
exposing a Modal.

---

## Ink components with no MUI equivalent

The parts that come from this system rather than from Material:

`InkEdge` · `InkStage` · `InkBubble` / `InkBubbleGroup` / `InkTyping` ·
`InkCalendar` / `InkDatePicker` / `InkDateRangePicker` / `InkTimePicker` ·
`InkBudget` · `InkNav` · `InkField` · `InkEyebrow` · `InkProse` · `InkMeter`

And the whole `@jarida/ink/headless` layer, which has no MUI counterpart at all:
the navbar state machine, the calendar arithmetic, pagination windowing, sort
cycling, roving focus, slider maths and match ranking — framework-free, so a
Vue or Svelte binding gets identical behaviour rather than a re-implementation.
