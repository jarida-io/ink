/**
 * `@jarida/ink/headless`
 *
 * Behaviour with no framework and no platform in it: pure functions and small
 * classes that decide what a component should do, leaving every renderer to
 * decide only what it should look like.
 *
 * This is the layer that makes the library usable outside React. A Vue app, a
 * Svelte app, a vanilla page or a framework that does not exist yet can import
 * these, pair them with `@jarida/ink/css`, and get the same navbar, the same
 * keyboard handling and the same toast timing as the React bindings — because
 * they are literally the same code.
 *
 * Nothing here imports anything. Zero dependencies, no DOM, no React.
 */
export * from "./navbar.js";
export * from "./roving.js";
export * from "./toast.js";
export * from "./slider.js";
