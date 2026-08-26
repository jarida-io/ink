/**
 * The package's own bundler wiring, so a consumer does not have to reinvent it.
 *
 * Ink is consumed from source rather than from a build — there is no compile
 * step, which is what makes editing a token and seeing it on screen one save
 * rather than two. The cost is that every bundler needs to be told where the
 * entry points are.
 *
 * Each one is mapped to its file rather than its directory. A bare directory
 * leaves the bundler to guess an index, and the guess does not survive the
 * package living outside the consuming project's root.
 *
 * Import this from every config that resolves modules. In `pond-desktop` that
 * is two — `vite.config.ts` and `vitest.config.ts` — because the test runner
 * has its own config file and does not inherit the app's.
 */
export interface AliasEntry {
  find: RegExp;
  replacement: string;
}

export function inkAlias(packageRoot: string): AliasEntry[] {
  const src = `${packageRoot.replace(/\/$/, "")}/src`;
  return [
    { find: /^@jarida\/ink$/, replacement: `${src}/index.ts` },
    { find: /^@jarida\/ink\/web$/, replacement: `${src}/web/index.ts` },
    { find: /^@jarida\/ink\/native$/, replacement: `${src}/native/index.ts` },
    { find: /^@jarida\/ink\/tokens$/, replacement: `${src}/tokens/index.ts` },
    { find: /^@jarida\/ink\/core$/, replacement: `${src}/core/index.ts` },
    // Everything else is a file path, `@jarida/ink/web/ink.css` above all.
    { find: /^@jarida\/ink\/(.*)$/, replacement: `${src}/$1` },
  ];
}
