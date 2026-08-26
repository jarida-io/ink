/**
 * `@jarida/ink/native`
 *
 * The same component names and the same props as `@jarida/ink/web`. Four
 * behaviours cannot be the same, and each is documented where it happens:
 *
 * - No hover rung. `InkState` never reaches `raised` here.
 * - The plate reserves 4px of layout; on the web a shadow reserves none.
 * - Reach is `hitSlop`, not a pseudo-element.
 * - The screen title's italic is a slant unless a real italic face is loaded.
 *
 * Load the fonts before rendering anything — `requiredNativeFonts()` lists
 * every family name Expo has to register.
 */
export { InkProvider, useInkTheme, useReduceMotion } from "./InkProvider.js";
export type { InkProviderProps } from "./InkProvider.js";
export { InkEdge } from "./InkEdge.js";
export type { InkEdgeProps } from "./InkEdge.js";
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
export { inkText, slantTransform } from "./type.js";
export type { InkTextSpec, InkTextResult } from "./type.js";
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
