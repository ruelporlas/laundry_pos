import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { theme } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
};

export function AppButton({
  title,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={getIconColor(variant)} />
        ) : (
          <>
            {icon && (
              <Ionicons name={icon} size={18} color={getIconColor(variant)} />
            )}

            <Text style={[styles.text, styles[`${variant}Text`]]}>{title}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

function getIconColor(variant: ButtonVariant) {
  switch (variant) {
    case "primary":
      return theme.colors.white;

    case "danger":
      return theme.colors.white;

    case "secondary":
    case "ghost":
      return theme.colors.primary;
  }
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.full,
    justifyContent: "center",
    alignItems: "center",
  },

  primary: {
    backgroundColor: theme.colors.primary,
  },

  secondary: {
    backgroundColor: theme.colors.primaryLight,
  },

  danger: {
    backgroundColor: theme.colors.danger,
  },

  ghost: {
    backgroundColor: theme.colors.transparent,
  },

  fullWidth: {
    width: "100%",
  },

  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },

  disabled: {
    opacity: 0.45,
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },

  text: {
    ...theme.typography.button,
  },

  primaryText: {
    color: theme.colors.white,
  },

  secondaryText: {
    color: theme.colors.primary,
  },

  dangerText: {
    color: theme.colors.white,
  },

  ghostText: {
    color: theme.colors.primary,
  },
});
