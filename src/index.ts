/**
 * `@jarida/ink` — everything with no framework in it.
 *
 * Tokens, geometry, contrast maths, the glass derivation, and the behaviour
 * state machines. Zero dependencies: no React, no React Native, no DOM. A Vue
 * app, a Svelte app, a build script, a test or a framework that does not exist
 * yet can import this and get the same rules the React bindings run on, because
 * they are the same code.
 *
 * Components come from `@jarida/ink/react` or `@jarida/ink/native`, and the
 * stylesheet from `@jarida/ink/css`. See README.md for the four places the two
 * renderers cannot behave identically.
 */
export * from "./tokens/index.js";
export * from "./core/index.js";
export * from "./headless/index.js";
