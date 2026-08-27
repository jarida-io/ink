/**
 * Catching a bad icon name before it ships.
 *
 * `InkIconName` stays open — it accepts any string — because closing it against
 * one version of one icon set turns working code into a compile error the day
 * that set updates, and a false error is worse than none: it teaches a team to
 * reach for `as any`, and that channel never recovers.
 *
 * The cost of staying open is that a typo survives the type-check. This closes
 * that gap from the other side, at build time, by reading the source: it finds
 * every literal icon name in a tree and reports the ones nothing will answer.
 *
 * It catches three things a type never could:
 *
 *   - a JavaScript caller, who has no types at all
 *   - a call site that reached for `as any` to silence something else
 *   - `icon={row.iconName}` — a name arriving from data, which is the most
 *     common real-world source of a bad one
 *
 * The third is only partly reachable, and honestly so: a literal in a data file
 * is found, a name assembled at runtime is not. What it does find, it finds in
 * CI, where a red build is cheap.
 *
 * This module reads the filesystem, so it is the one part of Ink that needs
 * Node. It is a separate entry point for exactly that reason — importing it
 * from an app bundle would pull `node:fs` into a browser build.
 *
 *     import { sweepIconNames } from "@jarida/ink/sweep";
 *     import { registeredIconNames } from "@jarida/ink";
 *
 *     registerIcons(ICONS);
 *     const bad = sweepIconNames("src", registeredIconNames());
 *     if (bad.length) {
 *       for (const m of bad) console.error(`${m.file}:${m.line}  ${m.detail}`);
 *       process.exit(1);
 *     }
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { normalizeIconName } from "../core/icons.js";

export interface IconNameMiss {
  readonly file: string;
  readonly line: number;
  /** The name as it was written in the source. */
  readonly written: string;
  /** The canonical key it resolved to. */
  readonly key: string;
  readonly suggestion?: string;
  /** A message ready to print. */
  readonly detail: string;
}

const SOURCE = /\.(?:tsx?|jsx?|mts|cts)$/;
const SKIP = new Set(["node_modules", "dist", "build", ".git", "coverage", ".next"]);
const TEST_FILE = /\.test\.[jt]sx?$|[\\/]__tests__[\\/]/;

/**
 * Replace every comment with spaces, keeping length and line breaks.
 *
 * A regex cannot do this: `"https://x"` contains `//`, and `/* /` inside a
 * string is not a comment. Tracking the state is only a few more lines than
 * getting it subtly wrong.
 */
function blankComments(text: string): string {
  const out = text.split("");
  let i = 0;
  let state: "code" | "line" | "block" | "single" | "double" | "template" = "code";
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (state === "code") {
      if (c === "/" && next === "/") { state = "line"; out[i] = out[i + 1] = " "; i += 2; continue; }
      if (c === "/" && next === "*") { state = "block"; out[i] = out[i + 1] = " "; i += 2; continue; }
      if (c === "'") state = "single";
      else if (c === '"') state = "double";
      else if (c === "`") state = "template";
      i += 1;
      continue;
    }
    if (state === "line") {
      if (c === "\n") state = "code";
      else out[i] = " ";
      i += 1;
      continue;
    }
    if (state === "block") {
      if (c === "*" && next === "/") { state = "code"; out[i] = out[i + 1] = " "; i += 2; continue; }
      if (c !== "\n") out[i] = " ";
      i += 1;
      continue;
    }
    // Inside a string: only its own terminator ends it, and a backslash escapes
    // whatever follows — including the terminator.
    if (c === "\\") { i += 2; continue; }
    if ((state === "single" && c === "'") || (state === "double" && c === '"') || (state === "template" && c === "`")) {
      state = "code";
    }
    i += 1;
  }
  return out.join("");
}

/**
 * The shapes a literal icon name is written in.
 *
 * Only literals: `icon={name}` is deliberately not matched, because a variable
 * has no value here and flagging it would produce a warning on every correct
 * dynamic call site — the fastest way to get a check switched off.
 */
const PATTERNS = [
  /\bicon\s*=\s*"([^"{}]+)"/g,
  /\bicon\s*=\s*'([^'{}]+)'/g,
  /\bicon\s*=\s*\{\s*"([^"]+)"\s*\}/g,
  /\bicon\s*=\s*\{\s*'([^']+)'\s*\}/g,
  /<InkIcon\b[^>]*?\bname\s*=\s*"([^"{}]+)"/g,
  /<InkIcon\b[^>]*?\bname\s*=\s*'([^'{}]+)'/g,
];

export interface SweepOptions {
  /**
   * Skip `*.test.*` files. On by default.
   *
   * A test that asserts what happens to a bad name contains a bad name, and
   * every one of them would be reported. A check with known-good failures in it
   * is a check people learn to skim, and then to switch off.
   */
  readonly skipTests?: boolean;
}

export function sweepIconNames(
  dir: string,
  known: readonly string[],
  options: SweepOptions = {},
): IconNameMiss[] {
  const skipTests = options.skipTests ?? true;
  const canonical = new Set(known.map(normalizeIconName));
  const loose = new Map<string, string>();
  for (const name of canonical) {
    const key = name.replace(/-/g, "");
    if (!loose.has(key)) loose.set(key, name);
  }

  const misses: IconNameMiss[] = [];
  for (const file of walk(dir)) {
    if (skipTests && TEST_FILE.test(file)) continue;
    // Comments are blanked rather than removed, so a reported line number still
    // points at the right line. Documentation is full of icon names — this
    // file's own prose names three that resolve nowhere — and reporting them
    // would bury the one real miss under a page of examples.
    const text = blankComments(readFileSync(file, "utf8"));
    for (const pattern of PATTERNS) {
      // Each file gets a fresh cursor; a shared /g regex would skip matches.
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        const written = match[1];
        const key = normalizeIconName(written);
        if (canonical.has(key) || loose.has(key.replace(/-/g, ""))) continue;
        const suggestion = nearest(key, canonical);
        misses.push({
          file,
          line: text.slice(0, match.index).split("\n").length,
          written,
          key,
          suggestion,
          detail: suggestion
            ? `no icon named "${written}". Did you mean "${suggestion}"?`
            : `no icon named "${written}". Register it, or check the spelling.`,
        });
      }
    }
  }
  return misses.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (SOURCE.test(entry)) yield full;
  }
}

/**
 * The same budgeted distance the runtime warning uses, over a plain set.
 *
 * Kept here rather than shared with `suggestIconName` because that one reads
 * the live registry, and a build-time sweep has no registry — only the list it
 * was handed.
 */
function nearest(key: string, names: Iterable<string>): string | undefined {
  const budget = Math.min(3, Math.max(1, Math.floor(key.length / 3)));
  let best: string | undefined;
  let bestDistance = budget + 1;
  for (const candidate of names) {
    if (Math.abs(candidate.length - key.length) > bestDistance) continue;
    let previous = Array.from({ length: candidate.length + 1 }, (_, i) => i);
    let current = new Array<number>(candidate.length + 1);
    let abandoned = false;
    for (let i = 1; i <= key.length; i += 1) {
      current[0] = i;
      let rowBest = current[0];
      for (let j = 1; j <= candidate.length; j += 1) {
        const sub = previous[j - 1] + (key[i - 1] === candidate[j - 1] ? 0 : 1);
        current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, sub);
        if (current[j] < rowBest) rowBest = current[j];
      }
      if (rowBest > bestDistance) {
        abandoned = true;
        break;
      }
      const swap = previous;
      previous = current;
      current = swap;
    }
    if (abandoned) continue;
    const distance = previous[candidate.length];
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
      if (distance === 1) break;
    }
  }
  return best;
}
