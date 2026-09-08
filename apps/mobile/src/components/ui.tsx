import React from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewProps
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { MIN_TOUCH_TARGET } from "../theme/tokens";

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const theme = useTheme();
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.ink }}>
      <Container
        style={{ flex: 1 }}
        contentContainerStyle={scroll ? { padding: theme.spacing.lg, gap: theme.spacing.lg } : undefined}
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}

type Variant = "display" | "title" | "body" | "label";

export function Text({ variant = "body", color, style, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  const theme = useTheme();
  const scale = theme.fontScale;
  const base = theme.type[variant];
  return (
    <RNText
      style={[
        {
          color: color ?? theme.colors.paper,
          fontSize: base.fontSize * scale,
          lineHeight: base.lineHeight * scale,
          fontWeight: base.fontWeight
        },
        style
      ]}
      {...rest}
    />
  );
}

export function Muted({ style, ...rest }: TextProps) {
  const theme = useTheme();
  return <Text variant="label" color={theme.colors.mist} style={style} {...rest} />;
}

export function Card({ children, style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.slate,
          borderRadius: theme.radius.card,
          borderWidth: 1,
          borderColor: theme.colors.line,
          padding: theme.spacing.lg,
          gap: theme.spacing.sm
        },
        style
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

interface ButtonProps extends PressableProps {
  label: string;
  variant?: "primary" | "outline" | "ghost";
  loading?: boolean;
}

export function Button({ label, variant = "primary", loading, style, disabled, ...rest }: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      style={(state) => [
        {
          minHeight: MIN_TOUCH_TARGET,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.pill,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: theme.spacing.sm,
          opacity: state.pressed ? 0.85 : disabled ? 0.5 : 1,
          backgroundColor: isPrimary ? theme.colors.cyan : "transparent",
          borderWidth: isOutline ? 1 : 0,
          borderColor: theme.colors.line
        },
        typeof style === "function" ? style(state) : style
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? theme.colors.onAccent : theme.colors.paper} />
      ) : (
        <RNText
          style={{
            color: isPrimary ? theme.colors.onAccent : theme.colors.paper,
            fontSize: theme.type.body.fontSize,
            fontWeight: "600"
          }}
        >
          {label}
        </RNText>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xs }}>
      {props.label ? <Muted>{props.label}</Muted> : null}
      <TextInput
        placeholderTextColor={theme.colors.mist}
        style={[
          {
            minHeight: MIN_TOUCH_TARGET,
            borderWidth: 1,
            borderColor: theme.colors.line,
            borderRadius: theme.radius.input,
            paddingHorizontal: theme.spacing.md,
            color: theme.colors.paper,
            fontSize: theme.type.body.fontSize
          },
          props.style
        ]}
        {...props}
      />
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing.lg, alignItems: "center" }}>
      <Muted style={{ textAlign: "center" }}>{text}</Muted>
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.line }} />;
}

export function UrgencyDot({ bucket }: { bucket: "overdue" | "today" | "tomorrow" | "this-week" | "later" | "none" }) {
  const theme = useTheme();
  const color =
    bucket === "overdue" ? theme.colors.overdue : bucket === "today" ? theme.colors.accentText : theme.colors.mist;
  const label =
    bucket === "overdue" ? "overdue" :
    bucket === "today" ? "due today" :
    bucket === "tomorrow" ? "due tomorrow" :
    bucket === "this-week" ? "due this week" :
    bucket === "later" ? "due later" : "";
  if (!label) return null;
  return <Text variant="label" color={color}>{label}</Text>;
}
