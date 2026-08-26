/**
 * Layout, tabs, and the two ways of showing rows of data.
 */
import { useCallback, useMemo, useRef, type ReactNode } from "react";
import { ariaSort, nextSort, sortRows, type SortState } from "../headless/table.js";
import type { SpaceStep } from "../tokens/space.js";

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ── Stack ─────────────────────────────────────────────────────────────────
 *
 * The one layout primitive worth having, and the reason is narrow: gaps come
 * from the scale. Every hand-written `margin-bottom: 12px` is a value that
 * drifted off the grid without anyone deciding to move it.
 *
 * There is no Grid here. CSS Grid and Flexbox-only React Native have no shared
 * model, so a `<Grid>` would be two different components wearing one name.
 */

export interface InkStackProps {
  direction?: "row" | "column";
  gap?: SpaceStep;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
  className?: string;
  children: ReactNode;
}

const ALIGN = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch", baseline: "baseline" };
const JUSTIFY = { start: "flex-start", center: "center", end: "flex-end", between: "space-between" };

export function InkStack({
  direction = "column",
  gap = 3,
  align = "stretch",
  justify = "start",
  wrap = false,
  className,
  children,
}: InkStackProps) {
  return (
    <div
      className={cx("ink-stack", className)}
      style={{
        display: "flex",
        flexDirection: direction,
        gap: `var(--space-${gap})`,
        alignItems: ALIGN[align],
        justifyContent: JUSTIFY[justify],
        flexWrap: wrap ? "wrap" : "nowrap",
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

/* ── Divider ───────────────────────────────────────────────────────────────
 *
 * A hairline by default. `tone="ink"` gives it the 2px charcoal rule, which is
 * the same weight as the edge and should be spent about as sparingly.
 */

export interface InkDividerProps {
  orientation?: "horizontal" | "vertical";
  tone?: "hairline" | "ink";
  /** A label sits in the rule rather than above it, so the rule keeps meaning. */
  label?: string;
  className?: string;
}

export function InkDivider({
  orientation = "horizontal",
  tone = "hairline",
  label,
  className,
}: InkDividerProps) {
  if (label && orientation === "horizontal") {
    return (
      <div className={cx("ink-divider", "ink-divider--labelled", className)} role="separator">
        <span className="ink-divider__rule" data-tone={tone} />
        <span className="ink-eyebrow">{label}</span>
        <span className="ink-divider__rule" data-tone={tone} />
      </div>
    );
  }
  return (
    <span
      role="separator"
      aria-orientation={orientation}
      data-tone={tone}
      className={cx("ink-divider", `ink-divider--${orientation}`, className)}
    />
  );
}

/* ── Tabs ──────────────────────────────────────────────────────────────────
 *
 * Tabs are for **views**; `InkSegmented` is for **values**. The distinction is
 * not pedantry — a tab changes what you are looking at and belongs in the URL,
 * a segment changes a setting and belongs in a form. Using one for the other is
 * how a back button stops working.
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
  className?: string;
}

export function InkTabs<T extends string>({
  label,
  value,
  tabs,
  onChange,
  className,
}: InkTabsProps<T>) {
  const list = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
      if (!keys.includes(event.key)) return;
      const enabled = tabs.filter((t) => !t.disabled);
      if (enabled.length === 0) return;
      event.preventDefault();
      const at = Math.max(0, enabled.findIndex((t) => t.value === value));
      let next = at;
      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = enabled.length - 1;
      else next = (at + (event.key === "ArrowRight" ? 1 : -1) + enabled.length) % enabled.length;
      onChange(enabled[next].value);
      const nodes = list.current?.querySelectorAll<HTMLButtonElement>("[role='tab']");
      nodes?.[tabs.findIndex((t) => t.value === enabled[next].value)]?.focus();
    },
    [tabs, value, onChange],
  );

  return (
    <div
      ref={list}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx("ink-tabs", className)}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          tabIndex={tab.value === value ? 0 : -1}
          disabled={tab.disabled}
          onClick={() => onChange(tab.value)}
          className="ink-tabs__tab"
        >
          {tab.label}
          {tab.badge ? <span className="ink-tabs__badge">{tab.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

/* ── Breadcrumb ────────────────────────────────────────────────────────────
 *
 * Truncates from the middle. The first crumb says where you are in the product
 * and the last says where you are now; the ones between are the least useful
 * thing on the line, so they are what goes.
 */

export interface InkCrumb {
  label: string;
  onPress?: () => void;
}

export function InkBreadcrumb({
  items,
  max = 4,
  className,
}: {
  items: InkCrumb[];
  max?: number;
  className?: string;
}) {
  const shown: (InkCrumb | null)[] =
    items.length <= max ? items : [items[0], null, ...items.slice(items.length - (max - 2))];

  return (
    <nav aria-label="Breadcrumb" className={cx("ink-breadcrumb", className)}>
      <ol>
        {shown.map((item, i) => (
          <li key={item ? `${item.label}-${i}` : `gap-${i}`}>
            {item === null ? (
              <span className="ink-breadcrumb__gap" aria-label="Skipped levels">
                &hellip;
              </span>
            ) : item.onPress && i < shown.length - 1 ? (
              <button type="button" onClick={item.onPress} className="ink-breadcrumb__link">
                {item.label}
              </button>
            ) : (
              <span aria-current={i === shown.length - 1 ? "page" : undefined}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ── Table ─────────────────────────────────────────────────────────────────
 *
 * Scrolls inside its own container, never the page. A table that makes the body
 * scroll sideways takes the whole layout with it.
 */

export interface InkColumn<Row> {
  key: string;
  header: string;
  /** Right-aligned and tabular. Anything a reader compares down a column. */
  numeric?: boolean;
  render: (row: Row) => ReactNode;
  /** Makes the header a button. Needs `sortValue` to know what to compare. */
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
  className,
}: {
  caption: string;
  columns: InkColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  empty?: ReactNode;
  /** Controlled. `null` is the order the rows arrived in. */
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  /** Header stays put while the body scrolls. */
  sticky?: boolean;
  className?: string;
}) {
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

  return (
    <div className={cx("ink-table", sticky && "ink-table--sticky", className)}>
      <table>
        <caption className="ink-eyebrow">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                data-numeric={c.numeric || undefined}
                // The one attribute that makes a sortable table usable without
                // sight: it says both that the column sorts and which way.
                aria-sort={c.sortable ? ariaSort(sort ?? null, c.key) : undefined}
              >
                {c.sortable ? (
                  <button
                    type="button"
                    className="ink-table__sort"
                    onClick={() => onSortChange?.(nextSort(sort ?? null, c.key))}
                  >
                    {c.header}
                    <span
                      className="ink-table__arrow"
                      data-dir={sort?.key === c.key ? sort.direction : undefined}
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.key} data-numeric={c.numeric || undefined}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── List ──────────────────────────────────────────────────────────────────
 *
 * Rows with hairlines and an empty state — the shape most tables actually
 * wanted, and the one that survives a narrow pane.
 */

export function InkList({
  label,
  empty,
  children,
  className,
}: {
  label: string;
  empty?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const items = Array.isArray(children) ? children : children ? [children] : [];
  if (items.length === 0 && empty) return <>{empty}</>;
  return (
    <div role="list" aria-label={label} className={cx("ink-list", className)}>
      {children}
    </div>
  );
}
