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
export { InkBottomBar, InkSidebar, InkNav } from "./navigation.js";
export type {
  InkBottomBarProps,
  InkSidebarProps,
  InkNavProps,
  InkNavSection,
  InkNavDestination,
} from "./navigation.js";
export type { InkNavbarProps, InkNavbarVariant, InkNavbarMaterial, InkNavbarAction } from "./InkNavbar.js";
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
  InkProgress,
  InkDots,
  useInkToast,
  readingTime,
} from "./feedback.js";
export type { InkToastMessage } from "./feedback.js";
export {
  InkInput,
  InkTextArea,
  InkSelect,
  InkCheckbox,
  InkSlider,
  InkRadioGroup,
  InkMenu,
  InkRangeSlider,
  InkForm,
  InkFormField,
} from "./forms.js";
export type {
  InkInputProps,
  InkSelectOption,
  InkRadioOption,
  InkMenuItem,
  InkFormError,
} from "./forms.js";
export {
  InkCalendar,
  InkDatePicker,
  InkDateRangePicker,
  InkTimePicker,
} from "./pickers.js";
export type {
  InkCalendarProps,
  InkDatePickerProps,
  InkTimePickerProps,
  CivilDate,
  CivilTime,
} from "./pickers.js";
export { InkBubble, InkBubbleGroup, InkTyping } from "./chat.js";
export type { InkBubbleProps, InkBubbleMessage, BubblePosition } from "./chat.js";
export { InkDialog, InkSheet } from "./overlays.js";
export type { InkDialogProps } from "./overlays.js";
export { InkBudget, useInkBudget } from "../shared/budget.js";
