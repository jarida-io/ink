import { describe, expect, it } from "vitest";
import { ariaSort, nextSort, sortRows, type SortState } from "./table.js";

describe("the sort cycle", () => {
  /**
   * Three states, not two. Once a reader has sorted a table the two-state cycle
   * gives them no way back to the order it arrived in — and that order is
   * frequently the meaningful one.
   */
  it("goes ascending, descending, then back to the original order", () => {
    let sort: SortState | null = null;
    sort = nextSort(sort, "name");
    expect(sort).toEqual({ key: "name", direction: "ascending" });
    sort = nextSort(sort, "name");
    expect(sort).toEqual({ key: "name", direction: "descending" });
    sort = nextSort(sort, "name");
    expect(sort).toBeNull();
  });

  it("starts a new column ascending, whatever the old one was doing", () => {
    expect(nextSort({ key: "name", direction: "descending" }, "size")).toEqual({
      key: "size",
      direction: "ascending",
    });
  });

  it("reports only the sorted column", () => {
    const sort: SortState = { key: "name", direction: "descending" };
    expect(ariaSort(sort, "name")).toBe("descending");
    expect(ariaSort(sort, "size")).toBe("none");
    expect(ariaSort(null, "name")).toBe("none");
  });
});

describe("sorting rows", () => {
  const rows = [
    { id: "a", name: "Item 10", size: 30 },
    { id: "b", name: "Item 9", size: 10 },
    { id: "c", name: "Item 2", size: 20 },
  ];
  const valueOf = (row: (typeof rows)[number], key: string) =>
    key === "size" ? row.size : row.name;

  it("returns the original array untouched when nothing is sorted", () => {
    expect(sortRows(rows, null, valueOf)).toBe(rows);
  });

  it("sorts numbers as numbers", () => {
    expect(sortRows(rows, { key: "size", direction: "ascending" }, valueOf).map((r) => r.id))
      .toEqual(["b", "c", "a"]);
  });

  it("sorts text naturally, so Item 10 follows Item 9", () => {
    expect(sortRows(rows, { key: "name", direction: "ascending" }, valueOf).map((r) => r.id))
      .toEqual(["c", "b", "a"]);
  });

  it("does not mutate the array it was given", () => {
    const copy = [...rows];
    sortRows(rows, { key: "size", direction: "descending" }, valueOf);
    expect(rows).toEqual(copy);
  });

  /**
   * Absent is not small. "No value" belonging at the top of a descending sort
   * is an answer nobody wants.
   */
  it("keeps missing values last in both directions", () => {
    const withGaps = [
      { id: "a", v: 2 as number | null },
      { id: "b", v: null },
      { id: "c", v: 1 },
    ];
    const get = (row: (typeof withGaps)[number]) => row.v;
    expect(sortRows(withGaps, { key: "v", direction: "ascending" }, get).map((r) => r.id))
      .toEqual(["c", "a", "b"]);
    expect(sortRows(withGaps, { key: "v", direction: "descending" }, get).map((r) => r.id))
      .toEqual(["a", "c", "b"]);
  });

  it("is stable, so equal rows do not shuffle on re-render", () => {
    const ties = [
      { id: "a", v: 1 }, { id: "b", v: 1 }, { id: "c", v: 1 }, { id: "d", v: 0 },
    ];
    const get = (row: (typeof ties)[number]) => row.v;
    const once = sortRows(ties, { key: "v", direction: "ascending" }, get).map((r) => r.id);
    const twice = sortRows(ties, { key: "v", direction: "ascending" }, get).map((r) => r.id);
    expect(once).toEqual(["d", "a", "b", "c"]);
    expect(twice).toEqual(once);
  });
});
