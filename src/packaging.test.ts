import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = dirname(fileURLToPath(import.meta.url));

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sources(full));
    else if ([".ts", ".tsx"].includes(extname(entry))) out.push(full);
  }
  return out;
}

/**
 * The shape of the thing that gets published, guarded from inside it.
 *
 * Both of these failed exactly once, in exactly the way that is invisible until
 * someone else installs the package: TypeScript compiles an extensionless
 * relative import happily and emits it unchanged, so `dist` is valid to a
 * bundler and unresolvable to Node. It surfaced as ERR_MODULE_NOT_FOUND in a
 * smoke test, not in a type-check and not in a unit test.
 */
describe("what ships", () => {
  it("gives every relative import a file extension, so Node ESM can resolve it", () => {
    const offenders: string[] = [];
    for (const file of sources(SRC)) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/\bfrom\s+"(\.[^"]*)"/g)) {
        const spec = match[1];
        if (!spec.endsWith(".js") && !spec.endsWith(".css")) {
          offenders.push(`${file.replace(SRC + "/", "")}: ${spec}`);
        }
      }
    }
    expect(
      offenders,
      `Extensionless relative imports compile and then fail in a consumer:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("keeps React Native out of the platform-neutral half", () => {
    // `@jarida/ink` and `@jarida/ink/web` must be importable in a project that
    // has never heard of React Native.
    const offenders: string[] = [];
    for (const dir of ["tokens", "core", "shared", "headless", "react"]) {
      for (const file of sources(join(SRC, dir))) {
        const text = readFileSync(file, "utf8");
        if (/from\s+"react-native"/.test(text)) offenders.push(file.replace(SRC + "/", ""));
      }
    }
    expect(offenders, "these reach for react-native outside src/native").toEqual([]);
  });

  /**
   * The library's central promise, as a test.
   *
   * "Every component here exists on both platforms with the same props." That
   * sentence is the reason the inventory has a *Deliberately out* column — a
   * tooltip and a popover are missing precisely because they could not keep it.
   * A promise like that survives exactly as long as something checks it.
   *
   * Names only. Props are checked by the two type-checks, which is the right
   * tool for that half.
   */
  it("exports the same component names from web and native", () => {
    const names = (entry: string) => {
      const text = readFileSync(join(SRC, entry, "index.ts"), "utf8");
      const found = new Set<string>();
      for (const match of text.matchAll(/^export\s+\{([^}]+)\}/gm)) {
        for (const part of match[1].split(",")) {
          const name = part.trim().split(/\s+as\s+/)[0].trim();
          if (name && !name.startsWith("type ")) found.add(name);
        }
      }
      return found;
    };

    const web = names("react");
    const native = names("native");

    // Each platform is allowed exactly what the other genuinely cannot have.
    const webOnly = ["usePrefersReducedMotion"];
    const nativeOnly = ["useReduceMotion", "InkEdge", "inkText", "slantTransform"];

    const missingFromNative = [...web].filter((n) => !native.has(n) && !webOnly.includes(n));
    const missingFromWeb = [...native].filter((n) => !web.has(n) && !nativeOnly.includes(n));

    expect(missingFromNative, "web exports these and native does not").toEqual([]);
    expect(missingFromWeb, "native exports these and web does not").toEqual([]);
  });

  it("keeps the DOM out of the platform-neutral half", () => {
    // `src/core` and `src/tokens` run on a device. A `document` there is a
    // crash, and the native type-check is the only thing that would catch it —
    // so it is worth catching here too, where the message is clearer.
    const offenders: string[] = [];
    for (const dir of ["tokens", "core", "headless"]) {
      for (const file of sources(join(SRC, dir))) {
        if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
        const text = readFileSync(file, "utf8");
        if (/\b(document|window)\s*\./.test(text)) offenders.push(file.replace(SRC + "/", ""));
      }
    }
    expect(offenders, "these touch the DOM from the shared half").toEqual([]);
  });
});
