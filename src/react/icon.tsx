/**
 * Drawing a named icon, on the web.
 *
 * Two jobs. It turns a registered icon — data or a component — into one `<svg>`
 * of the right size and weight, and it decides whether a screen reader should
 * hear about it.
 *
 * ## Decorative unless told otherwise
 *
 * An icon beside a word is a picture of that word. Announced, it reads
 * "search search", and the reader is now less certain what the control does
 * than if the icon had not been there. So every icon here is `aria-hidden` by
 * default and the caller opts *in* to meaning with `label`.
 *
 * The default runs the safe way round: the failure from hiding a meaningful
 * icon is a control that needs a label, which every icon-only control in this
 * library already requires and asserts. The failure from announcing a
 * decorative one is doubled speech on every row of every list, which nothing
 * catches because it is not an error.
 *
 * `aria-hidden` alone is not enough — a nested `<svg>` can still take focus in
 * IE-era engines and, more importantly, in some assistive tooling — so
 * `focusable="false"` goes on with it.
 */
import { useSyncExternalStore, type CSSProperties, type ReactElement, type ReactNode } from "react";
import {
  iconsVersion,
  isDev,
  resolveIcon,
  subscribeIcons,
  warnUnresolvedIcon,
  type InkIconName,
  type InkIconNode,
} from "../core/index.js";
import { toneColors, type InkTone } from "../core/tone.js";
import { iconStrokeWidth, ICON_STROKE } from "../tokens/control.js";
import { useInkTheme } from "./InkProvider.js";

/**
 * What an icon is painted with, always.
 *
 * `currentColor` alone would ignore a toned container; the variable alone would
 * fail outside one. Read together, an icon in a danger notice is danger-red and
 * an icon in a paragraph is the paragraph's colour, with no prop either way.
 */
const PAINT = "var(--ink-tone-fg, currentColor)";

/**
 * Anything a component's `icon` prop will take.
 *
 * `ReactNode` is deliberately *not* used here, and the reason is worth the
 * line: `ReactNode` contains bare `string`, so a union with it erases every
 * literal from autocomplete — you get 2000 registered names and your editor
 * offers none of them. It also contains `Iterable<ReactNode>`, and because a
 * `string` is an `Iterable<string>`, any string assigns through it. A union
 * built that way accepts `icon="serach"` with no complaint at all.
 *
 * `ReadonlyArray<ReactNode>` covers the fragment and array cases without
 * reopening that hole.
 */
export type InkIconSlot =
  | InkIconName
  | ReactElement
  | ReadonlyArray<ReactNode>
  | null
  | undefined
  | false;

export interface InkIconProps {
  /** A registered name. `search`, `Search`, `SearchIcon` and `arrow-right` all work. */
  name: InkIconName;
  /** Defaults to 20 — the `md` control size. See `controlIconSize`. */
  size?: number;
  /**
   * Name the meaning, not the colour.
   *
   * Omitted, an icon takes the colour of the text around it, which is right
   * almost everywhere. Inside a toned container — a chip, a badge, a notice —
   * it picks the container's tone up on its own, because the stroke reads the
   * same `--ink-tone-fg` the container sets.
   */
  tone?: InkTone;
  /** Device-pixel line weight, held constant across sizes. */
  strokeWidth?: number;
  /**
   * Give the icon a voice. Omit it and the icon is hidden from screen readers,
   * which is right for an icon sitting beside its own label.
   */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Re-render when a set is registered.
 *
 * Registration usually happens at the entry point, before anything mounts, and
 * then this does nothing. It earns its place in the cases where it does not: a
 * set loaded from a lazy chunk, a second `registerIcons` call, or a route that
 * registers its own icons on entry. Without a subscription those icons stay
 * blank until something unrelated re-renders the tree, and the bug reads as
 * "registration is broken" rather than "the frame is stale".
 */
function useIconsVersion(): number {
  return useSyncExternalStore(subscribeIcons, iconsVersion, iconsVersion);
}

export function InkIcon({
  name,
  size = 20,
  tone,
  strokeWidth = ICON_STROKE,
  label,
  className,
  style,
}: InkIconProps): ReactElement {
  useIconsVersion();
  const { color } = useInkTheme();
  const resolution = resolveIcon(name);

  // Meaning is opt-in; see the note at the top of the file.
  const a11y = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true, focusable: "false" } as const);

  if (resolution.status !== "ok") {
    warnUnresolvedIcon(resolution);
    return <InkIconGap size={size} className={className} style={style} name={resolution.key} />;
  }

  const toned = tone ? ({ "--ink-tone-fg": toneColors(tone, color).fg } as CSSProperties) : null;
  const shared = {
    width: size,
    height: size,
    className,
    style: toned ? { ...toned, ...style } : style,
    ...a11y,
  };

  if ("component" in resolution.source) {
    const Component = resolution.source.component as (props: Record<string, unknown>) => ReactElement;
    // Only the three props both lucide packages honour identically. Forwarding
    // more would work on web and quietly differ on device.
    return (
      <Component
        size={size}
        color={PAINT}
        strokeWidth={strokeWidth}
        {...a11y}
        className={className}
        style={toned ? { ...toned, ...style } : style}
      />
    );
  }

  return (
    <svg
      {...shared}
      viewBox="0 0 24 24"
      fill="none"
      stroke={PAINT}
      strokeWidth={iconStrokeWidth(size, strokeWidth)}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {renderNode(resolution.source.node)}
    </svg>
  );
}

function renderNode(node: InkIconNode): ReactElement[] {
  return node.map(([tag, attrs], i) => {
    const Tag = tag as "path";
    // Index keys are correct here and only here: the array is static icon
    // geometry that never reorders, inserts or deletes.
    return <Tag key={i} {...attrs} />;
  });
}

/**
 * What stands in for an icon that did not resolve.
 *
 * It occupies exactly the space the icon would have, so a missing name never
 * moves the layout around it — the row does not reflow when someone fixes the
 * spelling. In development it also draws a destructive-coloured box, because a
 * console warning scrolls away and a red square in the middle of the screen
 * does not.
 *
 * It never renders the name as text. Rendering the string is tempting — it
 * looks like a helpful fallback — but it means a typo, a stale bundle or two
 * copies of this package in a monorepo all ship the raw word "search" into
 * production UI, where it reads as finished work.
 */
function InkIconGap({
  size,
  className,
  style,
  name,
}: {
  size: number;
  className?: string;
  style?: CSSProperties;
  name: string;
}): ReactElement {
  return (
    <span
      aria-hidden
      data-ink-icon-missing={isDev() ? name : undefined}
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flex: "none",
        ...(isDev()
          ? {
              borderRadius: 3,
              boxShadow: "inset 0 0 0 1px var(--color-destructive, #b3261e)",
            }
          : null),
        ...style,
      }}
    />
  );
}

/**
 * Render whatever a component's `icon` prop was given.
 *
 * The one function every component calls, so that "a string means an icon" is
 * decided once rather than in twenty components that will drift.
 *
 * Deliberately a plain function and not a hook. Icons in this library are
 * rendered inside `.map()` and behind conditionals — `navigation.tsx` renders
 * `{item.icon}` inside a list whose length is derived from a ResizeObserver —
 * so a hook here would change hook count between renders and crash on the
 * first resize. `InkIcon` is a component, which may hold the subscription;
 * this is not, so it may not.
 */
export function renderIconSlot(slot: InkIconSlot, size?: number, label?: string): ReactNode {
  if (slot === null || slot === undefined || slot === false) return null;
  if (typeof slot === "string") return <InkIcon name={slot} size={size} label={label} />;
  return slot as ReactNode;
}
