/**
 * Layout, tabs and data, on native. Same names and props as the web renderer.
 */
import { useMemo, type ReactNode } from "react";
import { ariaSort, nextSort, sortRows, type SortState } from "../headless/table.js";
import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { SpaceStep } from "../tokens/space.js";
import { useInkTheme } from "./InkProvider.js";
import { inkText } from "./type.js";

/* ── Stack ─────────────────────────────────────────────────────────────── */

export interface InkStackProps {
  direction?: "row" | "column";
  gap?: SpaceStep;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

const ALIGN = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
} as const;
const JUSTIFY = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
} as const;

export function InkStack({
  direction = "column",
  gap = 3,
  align = "stretch",
  justify = "start",
  wrap = false,
  style,
  children,
}: InkStackProps) {
  const theme = useInkTheme();
  return (
    <View
      style={[
        {
          flexDirection: direction,
          gap: theme.space[gap],
          alignItems: ALIGN[align],
          justifyContent: JUSTIFY[justify],
          flexWrap: wrap ? "wrap" : "nowrap",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ── Divider ───────────────────────────────────────────────────────────── */

export interface InkDividerProps {
  orientation?: "horizontal" | "vertical";
  tone?: "hairline" | "ink";
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function InkDivider({
  orientation = "horizontal",
  tone = "hairline",
  label,
  style,
}: InkDividerProps) {
  const theme = useInkTheme();
  const thickness = tone === "ink" ? theme.edge.borderWidth : 1;
  const colour = tone === "ink" ? theme.color.edge : theme.color.line;
  const eyebrow = inkText(theme, {
    role: "mono",
    size: "xs",
    weight: theme.weight.bold,
    tracking: "eyebrow",
    uppercase: true,
    color: theme.color.textTertiary,
  });

  if (label && orientation === "horizontal") {
    return (
      <View style={[{ flexDirection: "row", alignItems: "center", gap: theme.space[3] }, style]}>
        <View style={{ flex: 1, height: thickness, backgroundColor: colour }} />
        <Text style={eyebrow.style}>{label}</Text>
        <View style={{ flex: 1, height: thickness, backgroundColor: colour }} />
      </View>
    );
  }

  return (
    <View
      accessibilityRole="none"
      style={[
        orientation === "horizontal"
          ? { height: thickness, backgroundColor: colour }
          : { width: thickness, alignSelf: "stretch", backgroundColor: colour },
        style,
      ]}
    />
  );
}

/* ── Tabs ──────────────────────────────────────────────────────────────────
 *
 * Chrome, so no edge. The selected tab is marked by a rule beneath it — the one
 * place a line does the job elevation does elsewhere, because a raised tab
 * would fight the content it sits above.
 */

export interface InkTab<T extends string> {
  value: T;
  label: string;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface InkTabsProps<T extends string> {
  label: string;
  value: T;
  tabs: InkTab<T>[];
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function InkTabs<T extends string>({
  label,
  value,
  tabs,
  onChange,
  style,
}: InkTabsProps<T>) {
  const theme = useInkTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="none"
      accessibilityLabel={label}
      style={[{ borderBottomWidth: 1, borderColor: theme.color.line }, style]}
      contentContainerStyle={{ flexDirection: "row", gap: theme.space[1] }}
    >
      {tabs.map((tab) => {
        const on = tab.value === value;
        const text = inkText(theme, {
          size: "md",
          weight: theme.weight.semibold,
          color: on ? theme.color.text : theme.color.textSecondary,
        });
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on, disabled: tab.disabled }}
            disabled={tab.disabled}
            onPress={() => onChange(tab.value)}
            style={{
              minHeight: theme.touch.tapMin,
              justifyContent: "center",
              paddingHorizontal: theme.space[4],
              borderBottomWidth: theme.edge.borderWidth,
              borderColor: on ? theme.color.accentLine : "transparent",
              opacity: tab.disabled ? 0.5 : 1,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space[2] }}>
              <Text style={text.style}>{tab.label}</Text>
              {tab.badge}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ── Breadcrumb ────────────────────────────────────────────────────────── */

export interface InkCrumb {
  label: string;
  onPress?: () => void;
}

export function InkBreadcrumb({
  items,
  max = 4,
  style,
}: {
  items: InkCrumb[];
  max?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const shown: (InkCrumb | null)[] =
    items.length <= max ? items : [items[0], null, ...items.slice(items.length - (max - 2))];
  const base = inkText(theme, { size: "sm", color: theme.color.textSecondary });
  const current = inkText(theme, { size: "sm", weight: theme.weight.semibold });
  const sep = inkText(theme, { size: "sm", color: theme.color.textTertiary });

  return (
    <View
      style={[{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: theme.space[2] }, style]}
    >
      {shown.map((item, i) => (
        <View
          key={item ? `${item.label}-${i}` : `gap-${i}`}
          style={{ flexDirection: "row", alignItems: "center", gap: theme.space[2] }}
        >
          {i > 0 ? <Text style={sep.style}>/</Text> : null}
          {item === null ? (
            <Text accessibilityLabel="Skipped levels" style={sep.style}>
              &hellip;
            </Text>
          ) : item.onPress && i < shown.length - 1 ? (
            <Pressable accessibilityRole="link" onPress={item.onPress}>
              <Text style={base.style}>{item.label}</Text>
            </Pressable>
          ) : (
            <Text style={current.style}>{item.label}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

/* ── Table ─────────────────────────────────────────────────────────────────
 *
 * Scrolls in its own container. On a 480px-wide panel that is not a nicety —
 * a table that pushes the screen sideways takes the navigation with it.
 */

export interface InkColumn<Row> {
  key: string;
  header: string;
  numeric?: boolean;
  render: (row: Row) => ReactNode;
  /** Native has no `table-layout`, so a column says how wide it is. */
  width?: number;
  sortable?: boolean;
  sortValue?: (row: Row) => string | number | null | undefined;
}

export function InkTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
  sort,
  onSortChange,
  sticky = false,
  style,
}: {
  caption: string;
  columns: InkColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  empty?: ReactNode;
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  sticky?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const byKey = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns]);
  const ordered = useMemo(
    () =>
      sortRows(rows, sort ?? null, (row, key) => {
        const column = byKey.get(key);
        return column?.sortValue ? column.sortValue(row) : undefined;
      }),
    [rows, sort, byKey],
  );

  if (rows.length === 0 && empty) return <>{empty}</>;

  const head = inkText(theme, {
    role: "mono",
    size: "xs",
    weight: theme.weight.bold,
    tracking: "eyebrow",
    uppercase: true,
    color: theme.color.textTertiary,
  });

  const header = (
    <View
      style={{
        flexDirection: "row",
        borderBottomWidth: theme.edge.borderWidth,
        borderColor: theme.color.edge,
        backgroundColor: theme.color.surface,
      }}
    >
      {columns.map((c) => {
        const cell = (
          <Text style={[head.style, c.numeric ? { textAlign: "right" } : null]}>{c.header}</Text>
        );
        return (
          <View key={c.key} style={{ width: c.width ?? 140, padding: theme.space[3] }}>
            {c.sortable ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${c.header}, ${ariaSort(sort ?? null, c.key)}`}
                onPress={() => onSortChange?.(nextSort(sort ?? null, c.key))}
                style={{ flexDirection: "row", alignItems: "center", gap: theme.space[1] }}
              >
                {cell}
                {sort?.key === c.key ? (
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderLeftWidth: 4,
                      borderRightWidth: 4,
                      borderLeftColor: "transparent",
                      borderRightColor: "transparent",
                      ...(sort.direction === "ascending"
                        ? { borderBottomWidth: 5, borderBottomColor: theme.color.accentLine }
                        : { borderTopWidth: 5, borderTopColor: theme.color.accentLine }),
                    }}
                  />
                ) : null}
              </Pressable>
            ) : (
              cell
            )}
          </View>
        );
      })}
    </View>
  );

  const body = ordered.map((row, i) => (
    <View
      key={rowKey(row)}
      style={{
        flexDirection: "row",
        borderTopWidth: i === 0 ? 0 : 1,
        borderColor: theme.color.line,
      }}
    >
      {columns.map((c) => (
        <View key={c.key} style={{ width: c.width ?? 140, padding: theme.space[3] }}>
          {c.render(row)}
        </View>
      ))}
    </View>
  ));

  return (
    <View
      accessibilityLabel={caption}
      style={[
        {
          borderWidth: theme.edge.hairlineWidth,
          borderColor: theme.color.lineStrong,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.color.surface,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {/* Sticky is structural rather than a style: the header sits OUTSIDE
            the vertical scroller, so it stays put because it is not in it. */}
        {sticky ? (
          <View>
            {header}
            <ScrollView>{body}</ScrollView>
          </View>
        ) : (
          <View>
            {header}
            {body}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ── List ──────────────────────────────────────────────────────────────── */

export function InkList({
  label,
  empty,
  children,
  style,
}: {
  label: string;
  empty?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const items = Array.isArray(children) ? children : children ? [children] : [];
  if (items.length === 0 && empty) return <>{empty}</>;
  return (
    <View accessibilityLabel={label} style={style}>
      {children}
    </View>
  );
}
