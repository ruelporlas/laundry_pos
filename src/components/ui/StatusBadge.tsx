import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { theme } from "@/constants/theme";

type StatusBadgeProps = {
  label: string;
  variant?: "success" | "warning" | "danger" | "neutral" | "primary";
};

export function StatusBadge({ label, variant = "neutral" }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, styles[`${variant}Text`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
  },

  success: {
    backgroundColor: colors.successLight,
  },

  warning: {
    backgroundColor: colors.warningLight,
  },

  danger: {
    backgroundColor: colors.dangerLight,
  },

  neutral: {
    backgroundColor: colors.background,
  },

  primary: {
    backgroundColor: colors.primaryLight,
  },

  text: {
    ...typography.caption,
  },

  successText: {
    color: colors.success,
  },

  warningText: {
    color: colors.warning,
  },

  dangerText: {
    color: colors.danger,
  },

  neutralText: {
    color: colors.textMuted,
  },

  primaryText: {
    color: colors.primary,
  },
});
