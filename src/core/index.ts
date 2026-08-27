/**
 * The shared half: geometry, typography resolution, tone and touch maths.
 *
 * Zero dependencies and zero framework. No React, no React Native, no DOM.
 * Anything importable from here runs in a browser, on a device, in a build
 * script or in a test, which is what lets one set of rules serve every
 * renderer rather than each one re-deriving them.
 */
export * from "./env.js";
export * from "./icons.js";
export * from "./font.js";
export * from "./edge.js";
export * from "./reach.js";
export * from "./tone.js";
