import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sweepIconNames } from "./index.js";

function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "ink-sweep-"));
  for (const [name, body] of Object.entries(files)) {
    const full = join(root, name);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

const KNOWN = ["search", "chevron-down", "arrow-right"];

describe("sweeping a tree for names nothing will answer", () => {
  it("finds a typo the type system was never going to catch", () => {
    const root = tree({
      "app.tsx": `<InkButton icon="serach">Find</InkButton>`,
    });
    const [miss] = sweepIconNames(root, KNOWN);
    expect(miss.written).toBe("serach");
    expect(miss.suggestion).toBe("search");
    expect(miss.line).toBe(1);
  });

  it("reads a JavaScript caller, which has no types at all", () => {
    // The reason this exists rather than a stricter union: a .js consumer gets
    // no compile-time help whatsoever, and is exactly who typos a name.
    const root = tree({ "legacy.js": `React.createElement(Btn, { icon: "bel" })` });
    // `icon: "bel"` is a property, not a JSX attribute — the sweep reads the
    // attribute forms, so this one is deliberately out of reach and the test
    // records that rather than pretending otherwise.
    expect(sweepIconNames(root, KNOWN)).toEqual([]);

    const jsx = tree({ "legacy.jsx": `<Btn icon="bel" />` });
    expect(sweepIconNames(jsx, KNOWN)).toHaveLength(1);
  });

  it("accepts every spelling the runtime accepts", () => {
    const root = tree({
      "a.tsx": `<A icon="Search" /><B icon="SearchIcon" /><C icon='arrow-right' />
<D icon={"chevronDown"} /><InkIcon name="LucideSearch" />`,
    });
    expect(sweepIconNames(root, KNOWN)).toEqual([]);
  });

  it("says nothing about a name that is not a literal", () => {
    // `icon={row.iconName}` has no value here. Flagging it would put a warning
    // on every correct dynamic call site, which is how a check gets turned off.
    const root = tree({ "a.tsx": `<A icon={row.iconName} /><B icon={pick()} />` });
    expect(sweepIconNames(root, KNOWN)).toEqual([]);
  });

  it("skips the directories a build fills with copies of the source", () => {
    const root = tree({
      "src/a.tsx": `<A icon="search" />`,
      "node_modules/pkg/b.tsx": `<B icon="definitely-not-real" />`,
      "dist/c.js": `<C icon="also-not-real" />`,
    });
    expect(sweepIconNames(root, KNOWN)).toEqual([]);
  });

  it("reports every miss in a file, not just the first", () => {
    const root = tree({ "a.tsx": `<A icon="one" />\n<B icon="two" />\n<C icon="search" />` });
    const misses = sweepIconNames(root, KNOWN);
    expect(misses.map((m) => m.written)).toEqual(["one", "two"]);
    expect(misses.map((m) => m.line)).toEqual([1, 2]);
  });

  it("ignores a name that is only mentioned in a comment", () => {
    // Documentation names icons constantly, including deliberately wrong ones
    // to explain a failure. Reporting those buries the one real miss.
    const root = tree({
      "a.tsx": `// icon="serach" is the typo this guards against
/* <A icon="also-not-real" /> */
/** @example <A icon="still-not-real" /> */
const url = "https://example.com/icon=fake";
<A icon="search" />`,
    });
    expect(sweepIconNames(root, KNOWN)).toEqual([]);
  });

  it("keeps line numbers right after blanking a comment", () => {
    const root = tree({ "a.tsx": `/* icon="ignored"
   still a comment */
<A icon="wrong" />` });
    const [miss] = sweepIconNames(root, KNOWN);
    expect(miss.written).toBe("wrong");
    expect(miss.line).toBe(3);
  });

  it("skips test files by default, and reads them when asked", () => {
    const root = tree({ "a.test.tsx": `<A icon="deliberately-wrong" />` });
    expect(sweepIconNames(root, KNOWN)).toEqual([]);
    expect(sweepIconNames(root, KNOWN, { skipTests: false })).toHaveLength(1);
  });
});
