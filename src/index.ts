/**
 * `@jarida/ink` — the platform-neutral half.
 *
 * Tokens, geometry and the rules, with no React DOM and no React Native in the
 * import graph. A build tool, a test, or a third platform can read this without
 * pulling either renderer in.
 *
 * Components come from `@jarida/ink/web` or `@jarida/ink/native`. They share
 * names and props; see README.md for the four places they cannot share
 * behaviour.
 */
export * from "./tokens/index.js";
export * from "./core/index.js";
