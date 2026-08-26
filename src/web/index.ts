/**
 * `@jarida/ink/web`
 *
 * Import the stylesheet once, at the same point you import the tokens:
 *
 *     import "@jarida/ink/web/ink.css";
 *
 * It is not imported from here on purpose — a package that pulls CSS into a
 * JavaScript import graph breaks every consumer whose bundler does not handle
 * it, and this one has to survive Vite, Next and a Tauri build.
 */
export { InkProvider, useInkTheme, usePrefersReducedMotion } from "./InkProvider.js";
export type { InkProviderProps } from "./InkProvider.js";
export { InkTitle, InkEyebrow, InkProse, InkBadge, InkNotice, InkMeter, InkStage } from "./primitives.js";
export type { InkTitleProps, InkBadgeProps, InkNoticeProps, InkMeterProps } from "./primitives.js";
export { InkCard, InkGroup, InkRow, InkField } from "./surfaces.js";
export type { InkCardProps, InkGroupProps, InkRowProps, InkFieldProps } from "./surfaces.js";
export { InkButton, InkChoice, InkSegmented, InkSwitch } from "./controls.js";
export type {
  InkButtonProps,
  InkButtonVariant,
  InkChoiceProps,
  InkSegmentedProps,
  InkSegmentedOption,
  InkSwitchProps,
} from "./controls.js";
export { InkBudget, useInkBudget } from "../core/budget.js";
