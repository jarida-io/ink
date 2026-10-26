/**
 * Chat bubbles, on native. Same three rules as the web renderer:
 * the tail belongs to the run rather than the message, side decides reading
 * order as well as alignment, and a bubble has a measure.
 */
import type { ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { WaveDots } from "./feedback.js";
import { useInkTheme } from "./InkProvider.js";
import { inkText } from "./type.js";

export type BubblePosition = "only" | "first" | "middle" | "last";

export interface InkBubbleProps {
  mine?: boolean;
  position?: BubblePosition;
  meta?: ReactNode;
  status?: "sent" | "sending" | "failed";
  author?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function InkBubble({
  mine = false,
  position = "only",
  meta,
  status = "sent",
  author,
  children,
  style,
}: InkBubbleProps) {
  const theme = useInkTheme();
  const tail = position === "only" || position === "last";
  const first = position === "only" || position === "first";
  const radius = theme.radius.xl;

  const body = inkText(theme, {
    size: "md",
    color: mine ? theme.color.textOnAccent : theme.color.text,
  });
  const authorStyle = inkText(theme, {
    size: "sm",
    weight: theme.weight.semibold,
    color: theme.color.textSecondary,
  });
  const metaStyle = inkText(theme, {
    role: "mono",
    size: "xs",
    color: theme.color.textTertiary,
  });

  return (
    <View
      style={[
        {
          maxWidth: "78%",
          gap: 2,
          alignSelf: mine ? "flex-end" : "flex-start",
          alignItems: mine ? "flex-end" : "flex-start",
          marginTop: first ? theme.space[3] : 0,
        },
        style,
      ]}
    >
      {author && first && !mine ? (
        <Text style={[authorStyle.style, { paddingHorizontal: theme.space[3] }]}>{author}</Text>
      ) : null}

      <View
        style={{
          paddingVertical: theme.space[3],
          paddingHorizontal: theme.space[4],
          borderRadius: radius,
          // Squaring the corner nearest the sender, on the last of a run, is
          // what makes four messages read as one turn.
          borderBottomLeftRadius: !mine && tail ? theme.radius.sm : radius,
          borderBottomRightRadius: mine && tail ? theme.radius.sm : radius,
          backgroundColor: mine ? theme.color.accent : theme.color.surface,
          borderWidth: mine ? 0 : theme.edge.hairlineWidth,
          borderColor: status === "failed" ? theme.color.dangerFg : theme.color.lineStrong,
          opacity: status === "sending" ? 0.6 : 1,
        }}
      >
        {typeof children === "string" ? <Text style={body.style}>{children}</Text> : children}
      </View>

      {meta || status === "failed" ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.space[2],
            paddingHorizontal: theme.space[3],
          }}
        >
          {status === "failed" ? (
            // In words. It is the one state where the reader has to act.
            <Text
              style={
                inkText(theme, {
                  role: "mono",
                  size: "xs",
                  weight: theme.weight.bold,
                  color: theme.color.dangerFg,
                }).style
              }
            >
              Not sent
            </Text>
          ) : null}
          {typeof meta === "string" ? <Text style={metaStyle.style}>{meta}</Text> : meta}
        </View>
      ) : null}
    </View>
  );
}

export interface InkBubbleMessage {
  id: string;
  mine?: boolean;
  author?: string;
  text: ReactNode;
  meta?: ReactNode;
  status?: "sent" | "sending" | "failed";
}

export function InkBubbleGroup({
  label,
  messages,
  style,
}: {
  label: string;
  messages: InkBubbleMessage[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View accessibilityLabel={label} accessibilityLiveRegion="polite" style={[{ gap: 2 }, style]}>
      {messages.map((message, i) => {
        const sameAsPrev =
          i > 0 && messages[i - 1].mine === message.mine && messages[i - 1].author === message.author;
        const sameAsNext =
          i < messages.length - 1 &&
          messages[i + 1].mine === message.mine &&
          messages[i + 1].author === message.author;
        const position: BubblePosition =
          sameAsPrev && sameAsNext ? "middle" : sameAsPrev ? "last" : sameAsNext ? "first" : "only";

        return (
          <InkBubble
            key={message.id}
            mine={message.mine}
            author={message.author}
            position={position}
            meta={message.meta}
            status={message.status}
          >
            {message.text}
          </InkBubble>
        );
      })}
    </View>
  );
}

/**
 * Hidden from assistive technology on purpose: announcing "typing" on every
 * keystroke of someone else's message is the most disruptive thing a chat
 * interface can do to a screen-reader user.
 */
export function InkTyping({ author, style }: { author?: string; style?: StyleProp<ViewStyle> }) {
  const theme = useInkTheme();
  return (
    <View style={[{ alignSelf: "flex-start", gap: 2 }, style]}>
      {author ? (
        <Text
          style={[
            inkText(theme, { size: "sm", weight: theme.weight.semibold, color: theme.color.textSecondary }).style,
            { paddingHorizontal: theme.space[3] },
          ]}
        >
          {author}
        </Text>
      ) : null}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          flexDirection: "row",
          alignSelf: "flex-start",
          paddingVertical: theme.space[3],
          paddingHorizontal: theme.space[4],
          borderRadius: theme.radius.xl,
          borderBottomLeftRadius: theme.radius.sm,
          backgroundColor: theme.color.surface,
          borderWidth: theme.edge.hairlineWidth,
          borderColor: theme.color.lineStrong,
        }}
      >
        <WaveDots size={6} gap={4} colour={theme.color.textTertiary} />
      </View>
    </View>
  );
}
