/**
 * React, but no platform.
 *
 * The library has three tiers and this is the middle one:
 *
 * - `core/`   zero dependencies of any kind. No React, no DOM, no React Native.
 * - `shared/` React only. Hooks and contexts that both renderers use unchanged.
 * - `react/` and `native/` the platform bindings.
 *
 * Anything here must run identically under React DOM and React Native, which
 * in practice means it touches no element, no style and no browser API.
 */
export { InkBudget, useEdgeBudget, useInkBudget } from "./budget.js";
export type { InkBudgetProps } from "./budget.js";
