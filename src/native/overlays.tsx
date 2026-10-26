/**
 * Dialog and sheet, on native.
 *
 * Both sit on `Modal` through `Overlay`, which is the platform's own
 * presentation and brings the back button, the accessibility viewport and the
 * hardware focus behaviour with it. Reimplementing that with an absolutely
 * positioned view is how an Android back button starts dismissing the wrong
 * thing.
 */
import { useRef, type ComponentRef, type ReactNode } from "react";
import { ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { InkBudget } from "../shared/budget.js";
import { InkEdge } from "./InkEdge.js";
import { useInkInsets, useInkTheme } from "./InkProvider.js";
import { Overlay } from "./overlay.js";
import { inkText, slantTransform } from "./type.js";

export interface InkDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** False for a question that must be answered: no backdrop, no back button, no escape. */
  dismissible?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function InkDialog({
  open,
  onClose,
  title,
  description,
  actions,
  dismissible = true,
  children,
  style,
}: InkDialogProps) {
  const theme = useInkTheme();
  const titleRef = useRef<ComponentRef<typeof Text>>(null);
  const heading = inkText(theme, {
    role: "display",
    size: "xl",
    weight: theme.weight.bold,
    italic: true,
    tracking: "title",
    leading: "tight",
  });
  const body = inkText(theme, { size: "base", color: theme.color.textSecondary });

  return (
    <Overlay
      open={open}
      onDismiss={dismissible ? onClose : undefined}
      placement="center"
      focusRef={titleRef}
    >
      {/* Its own budget: the panel and its one raised answer belong to the
          dialog, not to the screen underneath it. */}
      <InkBudget max={2} label="dialog">
        <InkEdge
          budgeted={false}
          radius={theme.radius.lg}
          contentStyle={[{ gap: theme.space[3], padding: theme.space[6] }, style]}
        >
          <Text
            ref={titleRef}
            accessibilityRole="header"
            style={[heading.style, heading.slant ? { transform: slantTransform(heading.slant) } : null]}
          >
            {title}
          </Text>
          {typeof description === "string" ? <Text style={body.style}>{description}</Text> : description}
          {children}
          {actions ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "flex-end",
                gap: theme.space[3],
                marginTop: theme.space[3],
              }}
            >
              {actions}
            </View>
          ) : null}
        </InkEdge>
      </InkBudget>
    </Overlay>
  );
}

/* ── Sheet ─────────────────────────────────────────────────────────────────
 *
 * Edge-anchored. The shape a panel on a shelf wants: it arrives from a
 * direction, it does not take the whole screen, and a thumb can reach its top.
 * A bottom sheet can be dragged by its handle and flicked away, and its body
 * scrolls once it reaches the top of the screen.
 */

export interface InkSheetProps {
  open: boolean;
  onClose: () => void;
  side?: "bottom" | "right" | "left";
  title: string;
  description?: ReactNode;
  /** False for a sheet that must be answered: no handle, no backdrop, no back button. */
  dismissible?: boolean;
  /**
   * The body scrolls once the sheet is as tall as the screen allows. Turn it
   * off only when the body brings its own list that must be the scroller.
   */
  scroll?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function InkSheet({
  open,
  onClose,
  side = "bottom",
  title,
  description,
  dismissible = true,
  scroll = true,
  children,
  style,
}: InkSheetProps) {
  const theme = useInkTheme();
  const insets = useInkInsets();
  const titleRef = useRef<ComponentRef<typeof Text>>(null);
  const heading = inkText(theme, {
    role: "display",
    size: "xl",
    weight: theme.weight.bold,
    italic: true,
    tracking: "title",
    leading: "tight",
  });
  const body = inkText(theme, { size: "base", color: theme.color.textSecondary });

  const bottom = side === "bottom";
  const radius = theme.radius["2xl"];
  const gutter = theme.space[5];

  const header = (
    <View
      style={{
        gap: theme.space[2],
        paddingTop: bottom ? theme.space[2] : insets.top + theme.space[6],
        paddingBottom: theme.space[4],
        paddingHorizontal: gutter,
      }}
    >
      {bottom && dismissible ? (
        <View
          style={{
            alignSelf: "center",
            width: 36,
            height: 5,
            marginBottom: theme.space[2],
            borderRadius: theme.radius.pill,
            backgroundColor: theme.color.textDisabled,
          }}
        />
      ) : null}
      <Text
        ref={titleRef}
        accessibilityRole="header"
        style={[heading.style, heading.slant ? { transform: slantTransform(heading.slant) } : null]}
      >
        {title}
      </Text>
      {typeof description === "string" ? <Text style={body.style}>{description}</Text> : description}
    </View>
  );

  const content: ViewStyle = { gap: theme.space[4], paddingHorizontal: gutter };

  return (
    <Overlay
      open={open}
      onDismiss={dismissible ? onClose : undefined}
      placement={bottom ? "bottom" : side === "left" ? "start" : "end"}
      draggable={bottom}
      focusRef={titleRef}
      header={header}
      panelStyle={[
        {
          width: bottom ? undefined : 380,
          paddingBottom: bottom ? undefined : insets.bottom + theme.space[6],
          borderWidth: theme.edge.borderWidth,
          borderColor: theme.color.edge,
          backgroundColor: theme.color.surface,
          borderTopLeftRadius: bottom || side === "right" ? radius : 0,
          borderTopRightRadius: bottom || side === "left" ? radius : 0,
          borderBottomLeftRadius: side === "right" ? radius : 0,
          borderBottomRightRadius: side === "left" ? radius : 0,
          // The edge that meets the screen's own has nothing to separate.
          borderBottomWidth: bottom ? 0 : theme.edge.borderWidth,
          borderLeftWidth: side === "left" ? 0 : theme.edge.borderWidth,
          borderRightWidth: side === "right" ? 0 : theme.edge.borderWidth,
        },
        style,
      ]}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          alwaysBounceVertical={false}
          style={{ flexShrink: 1 }}
          contentContainerStyle={content}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[content, { flexShrink: 1 }]}>{children}</View>
      )}
    </Overlay>
  );
}
