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
export type { InkProviderProps, InkProviderMode } from "./InkProvider.js";
export { InkTitle, InkEyebrow, InkProse, InkBadge, InkNotice, InkMeter, InkStage } from "./primitives.js";
export type { InkTitleProps, InkBadgeProps, InkNoticeProps, InkMeterProps } from "./primitives.js";
export { InkNavbar } from "./InkNavbar.js";
export type { InkNavbarProps, InkNavbarVariant } from "./InkNavbar.js";
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
export { InkStack, InkDivider, InkTabs, InkBreadcrumb, InkTable, InkList } from "./layout.js";
export type {
  InkStackProps,
  InkDividerProps,
  InkTab,
  InkTabsProps,
  InkCrumb,
  InkColumn,
} from "./layout.js";
export {
  InkSpinner,
  InkSkeleton,
  InkEmptyState,
  InkAvatar,
  InkToaster,
  useInkToast,
  readingTime,
} from "./feedback.js";
export type { InkToastMessage } from "./feedback.js";
export { InkInput, InkTextArea, InkSelect, InkCheckbox, InkSlider } from "./forms.js";
export type { InkInputProps, InkSelectOption } from "./forms.js";
export { InkDialog, InkSheet } from "./overlays.js";
export type { InkDialogProps } from "./overlays.js";
export { InkBudget, useInkBudget } from "../core/budget.js";
