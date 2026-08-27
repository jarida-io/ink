/**
 * Naming an icon in plain text.
 *
 * ## Why a registry and not an import
 *
 * The obvious design is for Ink to depend on lucide and hand you 2000 icons.
 * It does not work, for a reason that is structural rather than tasteful:
 * lucide ships as two packages, not one. `lucide-react` renders `<svg>` and
 * peers on React; `lucide-react-native` renders `react-native-svg` primitives
 * and peers on all three. Neither runs on the other's platform. A library that
 * depends on either has stopped being cross-platform, and a library that
 * depends on both cannot be installed.
 *
 * So the string is the contract and the artwork is injected. You register a set
 * once, from whichever package your platform actually has, and from then on an
 * icon is named the same way in every file and on every platform:
 *
 *     import { Search, Bell } from "lucide-react";
 *     registerIcons({ Search, Bell });
 *     // ...anywhere, on web or on device
 *     <InkButton icon="search">Find</InkButton>
 *
 * ## Register what you use, not everything
 *
 * `import { icons } from "lucide-react"` and passing the whole namespace works,
 * and it is the right answer for an icon picker or a documentation site. For an
 * application it is a mistake, and a measured one: a bundler can only shake an
 * icon set it can follow statically, so a namespace indexed by a variable pulls
 * all of it. Built with Vite 8 / rolldown, minified, React external:
 *
 *     three named imports .............     2.3 KB raw    1.2 KB gzip
 *     a 40-icon registry object ........    10.7 KB raw    3.9 KB gzip
 *     the whole `icons` namespace ......   612.7 KB raw  133.8 KB gzip
 *
 * The middle row is the shape this file is built around. Naming the icons in an
 * object literal keeps the set statically analysable, so the literal costs what
 * its members cost — the dynamic lookup happens on Ink's own Map afterwards,
 * where it is free, rather than on the bundler's module graph, where it is not.
 *
 * ## Names are canonicalised on both sides
 *
 * `Search`, `SearchIcon`, `LucideSearch`, `search`, `"Search Icon"` and
 * `search_icon` are one icon, and this file makes them one key. That matters
 * more than it sounds: the name you register comes from an import (PascalCase)
 * and the name you write comes from your fingers (kebab, usually), so without
 * canonicalisation the two halves of the feature never meet.
 *
 * Note the direction. This is not "convert PascalCase to lucide's filename" —
 * that conversion does not exist, because `Grid2x2` and `Grid2X2` are both real
 * and both mean a file. It is a canonical form applied symmetrically to the key
 * you register and the name you write, so the two agree whatever either looked
 * like. `icons.test.ts` proves that over all 2031 names lucide publishes.
 */
import { warnOnce } from "./env.js";
import { HOUSE_ICONS, type HouseIconName } from "./house-icons.js";

/**
 * An icon as data: a list of SVG elements and their attributes.
 *
 * Deliberately identical in shape to lucide's own `IconNode`, so a set exported
 * as data (`lucide-static`'s `icon-nodes.json`) can be registered without a
 * conversion step. Data is the only form that crosses platforms — a component
 * is bound to its renderer, but `["path", { d: "..." }]` draws anywhere.
 */
export type InkIconNode = readonly (readonly [tag: string, attrs: Readonly<Record<string, string | number>>])[];

/**
 * A registered icon: either data, or a component from the caller's own package.
 *
 * `component` is deliberately `unknown` here. This file is in `core/`, which
 * imports no framework, so it cannot name `ComponentType` without dragging
 * React into the one tier that is guaranteed not to need it. The platform
 * bindings narrow it; core only stores it.
 */
export type InkIconSource = { readonly node: InkIconNode } | { readonly component: unknown };

/**
 * Augment this to teach your editor the names you registered.
 *
 *     const ICONS = { Search, Bell } as const;
 *     registerIcons(ICONS);
 *     declare module "@jarida/ink" {
 *       interface InkIconRegistry extends InkIconsFrom<typeof ICONS> {}
 *     }
 *
 * Derived from the runtime object rather than written out, so the completions
 * cannot drift from what is actually registered — the failure that makes most
 * hand-maintained name unions worse than none.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InkIconRegistry {}

/**
 * A name you may write.
 *
 * The house names and any you have augmented in are offered as completions.
 * `string & {}` keeps every other string legal without collapsing the union —
 * a bare `string` in a union erases the literals from autocomplete entirely,
 * which is how this feature is usually shipped broken.
 *
 * It stays open on purpose. A closed union pinned to one icon-set version turns
 * a working call site into a compile error the day the set updates, and a false
 * error is worse than none: it teaches the team to reach for `as any`. Typos
 * are caught by the dev-time warning and by `sweepIconNames` in CI, both of
 * which also catch the case no type can — a name arriving from data.
 */
export type InkIconName = HouseIconName | Extract<keyof InkIconRegistry, string> | (string & {});

/** Derive an augmentation from the object you registered. See `InkIconRegistry`. */
export type InkIconsFrom<T> = { [K in keyof T as NormalizedName<K & string>]: true };

/** The type-level half of `normalizeIconName`, so completions match runtime. */
type NormalizedName<S extends string> = Lowercase<CamelToKebab<StripAffixes<S>>>;
type StripAffixes<S extends string> = S extends `Lucide${infer R}`
  ? StripAffixes<R>
  : S extends `${infer R}Icon`
    ? (R extends "" ? S : StripAffixes<R>)
    : S;
type CamelToKebab<S extends string> = S extends `${infer H}${infer T}`
  ? T extends ""
    ? H
    : `${H}${Boundary<H, T>}${CamelToKebab<T>}`
  : S;
type Boundary<Prev extends string, Rest extends string> = Rest extends `${infer N}${string}`
  ? Prev extends Lowercase<Prev>
    ? (N extends Lowercase<N> ? "" : "-")
    : ""
  : "";

const LOWER_THEN_UPPER = /([a-z0-9])([A-Z])/g;
const UPPER_RUN_THEN_WORD = /([A-Z]+)([A-Z][a-z])/g;
const LETTER_THEN_DIGIT = /([a-zA-Z])([0-9])/g;
const SEPARATORS = /[\s_.]+/g;

/**
 * One canonical key for every spelling of an icon's name.
 *
 * Applied to the key you register *and* the name you write, which is what lets
 * `registerIcons({ ArrowRight })` answer `icon="arrow-right"`.
 *
 * The digit rule is the subtle one, and it is why this is not simply lucide's
 * `toKebabCase`. Lucide names a file `volume-2` and exports it as `Volume2`;
 * their kebab conversion is `([a-z0-9])([A-Z])`, which turns `Volume2` into
 * `volume2` and misses the file by a hyphen. Splitting before a digit closes
 * that, and — because it runs on both sides — it also keeps `Grid2x2` and
 * `grid-2x2` together even though neither maps onto lucide's filename.
 */
export function normalizeIconName(input: string): string {
  let name = input.trim();
  if (!name) return "";

  // Import spellings first: lucide publishes Search, SearchIcon and LucideSearch
  // as three names for one icon, and a developer registers whichever their
  // editor auto-imported.
  if (name.startsWith("Lucide") && name.length > 6) name = name.slice(6);
  if (name.endsWith("Icon") && name.length > 4) name = name.slice(0, -4);

  return name
    .replace(SEPARATORS, "-")
    .replace(UPPER_RUN_THEN_WORD, "$1-$2")
    .replace(LOWER_THEN_UPPER, "$1-$2")
    .replace(LETTER_THEN_DIGIT, "$1-$2")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const registry = new Map<string, InkIconSource>();

/**
 * A second index that ignores hyphenation, consulted only when the first misses.
 *
 * Canonicalisation gets a name to one key; it cannot get two *different* names
 * to the same one where the icon set itself disagrees about where the words
 * are. Lucide exports `ArrowDownAZ` from a file called `arrow-down-a-z`, and
 * `Clock12` from one called `clock-12` — the same convention would have to
 * split `AZ` and join `12`, so no single rule satisfies both. There are 32 such
 * names, and someone who registers the import but writes the name off
 * lucide.dev hits one eventually.
 *
 * Dropping the hyphens sidesteps the disagreement instead of adjudicating it.
 * Measured against all 1768 distinct icons lucide publishes, that produces zero
 * collisions, and it rescues all 32 — so the looser key costs nothing and the
 * canonical key stays a name a human would recognise. Splitting the digits
 * instead would have keyed `clock-12` as `clock-1-2`, a name that exists
 * nowhere.
 */
const looseIndex = new Map<string, string>();

function index(key: string, source: InkIconSource): void {
  registry.set(key, source);
  const loose = key.replace(/-/g, "");
  // First registration wins, so a later set cannot silently steal a name that
  // already resolves exactly for someone.
  if (!looseIndex.has(loose)) looseIndex.set(loose, key);
}

function seedHouse(): void {
  for (const [name, node] of Object.entries(HOUSE_ICONS)) {
    index(name, { node: node as InkIconNode });
  }
}

seedHouse();

const HOUSE_COUNT = registry.size;

/**
 * Bumped on every registration so mounted icons can repaint.
 *
 * A set registered from a lazily loaded chunk, or a second `registerIcons` call
 * after first paint, would otherwise leave already-mounted slots showing their
 * fallback forever — they have no reason to re-render. The platform `InkIcon`
 * subscribes to this through `useSyncExternalStore`.
 */
let version = 0;
const listeners = new Set<() => void>();

export function subscribeIcons(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function iconsVersion(): number {
  return version;
}

/**
 * Register an icon set. Call it once, before render, from your entry point.
 *
 * Accepts components (`{ Search }` from lucide-react or lucide-react-native)
 * and data (`icon-nodes.json` from lucide-static) in the same call, because
 * which one you have depends on your platform and you should not have to care
 * at the call site.
 *
 * Deliberately a function you call rather than an import with a side effect.
 * This package declares `sideEffects: ["*.css"]`, which tells every bundler
 * that its JavaScript is safe to drop — so a module that registered on import
 * could be tree-shaken away, and the symptom would be icons that work in dev
 * and vanish in production.
 */
export function registerIcons(set: Record<string, unknown>): void {
  let changed = false;
  for (const [rawName, value] of Object.entries(set)) {
    if (value == null) continue;
    const key = normalizeIconName(rawName);
    if (!key) continue;
    index(key, Array.isArray(value) ? { node: value as InkIconNode } : { component: value });
    changed = true;
  }
  if (!changed) return;
  version += 1;
  for (const listener of listeners) listener();
}

/**
 * Hand Ink the SVG primitives for a platform that has none built in.
 *
 * The web needs nothing here — the browser draws SVG itself. React Native has
 * no drawing primitives at all, so an app that wants Ink's house set
 * on device passes `react-native-svg` in once:
 *
 *     import * as Svg from "react-native-svg";
 *     configureIconPrimitives(Svg);
 *
 * Most native apps never call it. Registering `lucide-react-native` components
 * covers every icon they name, and those components bring their own renderer —
 * `react-native-svg` is already a required peer of that package. This is only
 * the path for icons that arrive as *data*: Ink's own house set, or a set
 * registered from `lucide-static`.
 *
 * It lives in `core/` rather than in the native binding so that the two
 * platform entry points keep exporting exactly the same names. A function that
 * exists on one side and not the other is how a cross-platform library starts
 * being two libraries.
 */
let primitives: Record<string, unknown> | undefined;

export function configureIconPrimitives(set: Record<string, unknown>): void {
  primitives = set;
  version += 1;
  for (const listener of listeners) listener();
}

export function iconPrimitives(): Record<string, unknown> | undefined {
  return primitives;
}

/** Drop everything registered, keeping the house set. Tests use this. */
export function resetIcons(): void {
  registry.clear();
  looseIndex.clear();
  seedHouse();
  version += 1;
  for (const listener of listeners) listener();
}

/** Every name that currently resolves, canonical form, sorted. */
export function registeredIconNames(): string[] {
  return [...registry.keys()].sort();
}

/**
 * Three outcomes, not two.
 *
 * "You have not registered a set" and "that name is not in the set you
 * registered" have different causes and different fixes, and collapsing them
 * produces the wrong advice at the exact moment someone is stuck. The first
 * wants an entry-point snippet; the second wants a spelling.
 */
export type IconResolution =
  | { readonly status: "ok"; readonly key: string; readonly source: InkIconSource }
  | { readonly status: "bare"; readonly key: string }
  | { readonly status: "unknown"; readonly key: string; readonly suggestion?: string };

export function resolveIcon(name: string): IconResolution {
  const key = normalizeIconName(name);
  const source = registry.get(key);
  if (source) return { status: "ok", key, source };

  const looseKey = looseIndex.get(key.replace(/-/g, ""));
  if (looseKey !== undefined) {
    const looseSource = registry.get(looseKey);
    if (looseSource) return { status: "ok", key: looseKey, source: looseSource };
  }

  const suggestion = suggestIconName(key);
  return registry.size <= HOUSE_COUNT && !suggestion
    ? { status: "bare", key }
    : { status: "unknown", key, suggestion };
}

/**
 * Warn once, actionably, for a name that did not resolve.
 *
 * `warnOnce` already prefixes `ink: `, so these must not repeat it.
 */
export function warnUnresolvedIcon(resolution: IconResolution): void {
  if (resolution.status === "ok") return;
  if (resolution.status === "bare") {
    warnOnce(
      `no icon named "${resolution.key}", and no icon set has been registered.\n` +
        `  Register the icons you use, once, from your entry point:\n\n` +
        `    import { registerIcons } from "@jarida/ink";\n` +
        `    import { Search, Bell } from "lucide-react";  // or "lucide-react-native"\n` +
        `    registerIcons({ Search, Bell });\n\n` +
        `  Ink ships ${HOUSE_COUNT} built-in names for its own chrome: ${Object.keys(HOUSE_ICONS).join(", ")}.`,
    );
    return;
  }
  warnOnce(
    resolution.suggestion
      ? `no icon named "${resolution.key}". Did you mean "${resolution.suggestion}"?`
      : `no icon named "${resolution.key}". Pass it to registerIcons() first, ` +
          `or check the spelling against the set you registered.`,
  );
}

/**
 * The nearest registered name, or nothing.
 *
 * Budgeted edit distance: the tolerance is a third of the name's length capped
 * at three, and a row is abandoned the moment every cell in it exceeds that.
 * Against a 2000-entry registry an unbudgeted matrix is roughly 2000 x 12 x 12
 * cells for a single typo, on a path that runs during render.
 */
export function suggestIconName(key: string): string | undefined {
  if (!key) return undefined;
  const budget = Math.min(3, Math.max(1, Math.floor(key.length / 3)));
  let best: string | undefined;
  let bestDistance = budget + 1;

  for (const candidate of registry.keys()) {
    if (Math.abs(candidate.length - key.length) > bestDistance) continue;
    const distance = boundedDistance(key, candidate, bestDistance);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
      if (distance === 1) break;
    }
  }
  return best;
}

function boundedDistance(a: string, b: string, limit: number): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    let rowBest = current[0];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, substitution);
      if (current[j] < rowBest) rowBest = current[j];
    }
    // Every path through this row already costs more than we would accept, and
    // distance never decreases going down, so nothing below can qualify.
    if (rowBest > limit) return limit + 1;
    const swap = previous;
    previous = current;
    current = swap;
  }
  return previous[b.length];
}

export { HOUSE_ICONS, type HouseIconName };
