/**
 * Dialog and sheet, on native.
 *
 * Both are `Modal`, which is the platform's own presentation and brings the
 * back-button handling, the accessibility viewport and the hardware focus
 * behaviour with it. Reimplementing that with an absolutely-positioned view is
 * how an Android back button starts dismissing the wrong thing.
 */
import type { ReactNode } from "react";
import { Modal, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useInkTheme } from "./InkProvider.js";
import { inkText, slantTransform } from "./type.js";

export interface InkDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
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
  const heading = inkText(theme, {
    role: "display",
    size: "xl",
    weight: theme.weight.bold,
    italic: true,
    tracking: "title",
    leading: "tight",
  });
  const body = inkText(theme, { size: "sm", color: theme.color.textSecondary });

  return (
    <Modal
      visible={open}
      transparent
      animationType={theme.animate ? "fade" : "none"}
      // Android's hardware back reaches this. A dialog that must be answered
      // refuses it rather than letting the system dismiss it.
      onRequestClose={dismissible ? onClose : () => {}}
    >
      <Pressable
        accessibilityLabel="Close"
        disabled={!dismissible}
        onPress={dismissible ? onClose : undefined}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: theme.space[6],
          backgroundColor: "rgba(23, 22, 22, 0.42)",
        }}
      >
        {/* A press inside the panel must not reach the backdrop above. */}
        <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 480 }}>
          <View
            style={[
              {
                gap: theme.space[3],
                padding: theme.space[6],
                borderWidth: theme.edge.borderWidth,
                borderColor: theme.color.edge,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.color.surface,
              },
              style,
            ]}
          >
            <Text
              accessibilityRole="header"
              style={[
                heading.style,
                heading.slant ? { transform: slantTransform(heading.slant) } : null,
              ]}
            >
              {title}
            </Text>
            {typeof description === "string" ? (
              <Text style={body.style}>{description}</Text>
            ) : (
              description
            )}
            {children}
            {actions ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: theme.space[3],
                  marginTop: theme.space[2],
                }}
              >
                {actions}
              </View>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ── Sheet ─────────────────────────────────────────────────────────────────
 *
 * Edge-anchored. The shape a panel on a shelf wants: it arrives from a
 * direction, it does not take the whole screen, and a thumb can reach its top.
 */

export function InkSheet({
  open,
  onClose,
  side = "bottom",
  title,
  children,
  style,
}: {
  open: boolean;
  onClose: () => void;
  side?: "bottom" | "right" | "left";
  title: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useInkTheme();
  const heading = inkText(theme, {
    role: "display",
    size: "xl",
    weight: theme.weight.bold,
    italic: true,
    tracking: "title",
    leading: "tight",
  });

  const bottom = side === "bottom";
  const radius = theme.radius["2xl"];

  return (
    <Modal
      visible={open}
      transparent
      animationType={theme.animate ? (bottom ? "slide" : "fade") : "none"}
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityLabel="Close"
        onPress={onClose}
        style={{
          flex: 1,
          justifyContent: bottom ? "flex-end" : "center",
          alignItems: bottom ? "stretch" : side === "right" ? "flex-end" : "flex-start",
          backgroundColor: "rgba(23, 22, 22, 0.42)",
        }}
      >
        <Pressable onPress={() => {}}>
          <View
            style={[
              {
                gap: theme.space[4],
                padding: theme.space[6],
                width: bottom ? undefined : 380,
                height: bottom ? undefined : "100%",
                borderWidth: theme.edge.borderWidth,
                borderColor: theme.color.edge,
                borderTopLeftRadius: bottom || side === "right" ? radius : 0,
                borderTopRightRadius: bottom || side === "left" ? radius : 0,
                borderBottomLeftRadius: side === "right" ? radius : 0,
                borderBottomRightRadius: side === "left" ? radius : 0,
                backgroundColor: theme.color.surface,
              },
              style,
            ]}
          >
            <Text
              accessibilityRole="header"
              style={[
                heading.style,
                heading.slant ? { transform: slantTransform(heading.slant) } : null,
              ]}
            >
              {title}
            </Text>
            {children}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
