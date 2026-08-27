/**
 * Drawing a named icon, on device. Same names, same props, same weight.
 *
 * The web renderer has `<svg>` in the document. This one has nothing: React
 * Native ships no drawing primitives, so an icon here is either a component the
 * app registered — which brings its own renderer — or data, which needs one
 * handed in through `configureIconPrimitives`.
 *
 * That split is the whole reason `icon="search"` can mean the same thing on
 * both platforms. The name is Ink's; the artwork and the renderer are the
 * app's, and they arrive from whichever package that platform actually has.
 *
 * ## Hiding a decorative icon takes two props, not one
 *
 * `accessibilityElementsHidden` is iOS and `importantForAccessibility` is
 * Android, and neither has any effect on the other platform. Setting one is the
 * usual way this gets written, and it produces an icon that is silent on the
 * author's simulator and doubles every label on the other OS — a bug that
 * survives review because the reviewer also only ran one platform.
 */
import { useSyncExternalStore, type ReactElement, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import {
  iconPrimitives,
  iconsVersion,
  isDev,
  resolveIcon,
  subscribeIcons,
  warnOnce,
  warnUnresolvedIcon,
  type InkIconName,
  type InkIconNode,
} from "../core/index.js";
import { toneColors, type InkTone } from "../core/tone.js";
import { iconStrokeWidth, ICON_STROKE } from "../tokens/control.js";
import { useInkTheme } from "./InkProvider.js";

/** See the web renderer for why this is not `ReactNode`. */
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
   * Omitted, an icon takes the theme's text colour. There is no `currentColor`
   * on this platform — nothing inherits — so the colour is resolved here rather
   * than left to the renderer, which is the one place the two platforms cannot
   * share an implementation even though they share the result.
   */
  tone?: InkTone;
  /** Device-pixel line weight, held constant across sizes. */
  strokeWidth?: number;
  /** Give the icon a voice. Omit it and it is hidden from screen readers. */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

function useIconsVersion(): number {
  return useSyncExternalStore(subscribeIcons, iconsVersion, iconsVersion);
}

/** Decorative on both operating systems, or meaningful on both. Never one each. */
function accessibility(label?: string) {
  return label
    ? ({ accessible: true, accessibilityRole: "image" as const, accessibilityLabel: label } as const)
    : ({
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: "no-hide-descendants" as const,
      } as const);
}

export function InkIcon({
  name,
  size = 20,
  tone,
  strokeWidth = ICON_STROKE,
  label,
  style,
}: InkIconProps): ReactElement {
  useIconsVersion();
  const theme = useInkTheme();
  const paint = tone ? toneColors(tone, theme.color).fg : theme.color.text;
  const resolution = resolveIcon(name);
  const a11y = accessibility(label);

  if (resolution.status !== "ok") {
    warnUnresolvedIcon(resolution);
    return <InkIconGap size={size} style={style} />;
  }

  if ("component" in resolution.source) {
    const Component = resolution.source.component as (props: Record<string, unknown>) => ReactElement;
    // The three props both lucide packages honour identically, and nothing else.
    return <Component size={size} color={paint} strokeWidth={strokeWidth} {...a11y} style={style} />;
  }

  const svg = iconPrimitives();
  if (!svg?.Svg) {
    warnOnce(
      `"${resolution.key}" is icon data, and React Native has no way to draw it yet.\n` +
        `  Either register components instead of data:\n\n` +
        `    import { Search } from "lucide-react-native";\n` +
        `    registerIcons({ Search });\n\n` +
        `  or hand Ink a renderer once, from your entry point:\n\n` +
        `    import * as Svg from "react-native-svg";\n` +
        `    configureIconPrimitives(Svg);`,
    );
    return <InkIconGap size={size} style={style} />;
  }

  const Svg = svg.Svg as (props: Record<string, unknown>) => ReactElement;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={paint}
      strokeWidth={iconStrokeWidth(size, strokeWidth)}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      {...a11y}
    >
      {renderNode(resolution.source.node, svg)}
    </Svg>
  );
}

/**
 * The house set uses only `path` and `circle`, which is not an accident — it is
 * the reason this lookup is two entries rather than the eight tags SVG allows.
 * A set registered as data from elsewhere may use more, so an unknown tag is
 * skipped rather than crashed on, and says so once.
 */
function renderNode(node: InkIconNode, svg: Record<string, unknown>): ReactElement[] {
  const drawn: ReactElement[] = [];
  node.forEach(([tag, attrs], i) => {
    const Primitive = svg[tag.charAt(0).toUpperCase() + tag.slice(1)] as
      | ((props: Record<string, unknown>) => ReactElement)
      | undefined;
    if (!Primitive) {
      warnOnce(`react-native-svg has no primitive for <${tag}>, so part of an icon did not draw.`);
      return;
    }
    drawn.push(<Primitive key={i} {...attrs} />);
  });
  return drawn;
}

/**
 * The space an unresolved icon would have taken.
 *
 * Holds the layout still so fixing a name does not reflow the row, and never
 * renders the name as text — a raw word shipped into production UI reads as
 * finished work. In development it outlines the gap, because a Metro warning
 * scrolls past and a red box does not.
 */
function InkIconGap({ size, style }: { size: number; style?: StyleProp<ViewStyle> }): ReactElement {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width: size, height: size },
        isDev() ? { borderRadius: 3, borderWidth: 1, borderColor: "#b3261e" } : null,
        style,
      ]}
    />
  );
}

/**
 * Render whatever a component's `icon` prop was given.
 *
 * A plain function, not a hook — `navigation.tsx` renders icons inside a
 * `.map()` whose length changes with the container width, so a hook here would
 * change hook count between renders. `InkIcon` is a component and may
 * subscribe; this is not and may not.
 */
export function renderIconSlot(slot: InkIconSlot, size?: number, label?: string): ReactNode {
  if (slot === null || slot === undefined || slot === false) return null;
  if (typeof slot === "string") return <InkIcon name={slot} size={size} label={label} />;
  return slot as ReactNode;
}
