import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { theme } from "@/constants/theme";

type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
};

export function EmptyState({
  icon = "file-tray-outline",
  title,
  message,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={32} color={colors.primary} />
      </View>

      <Text style={styles.title}>{title}</Text>

      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing["5xl"],
  },

  iconContainer: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
  },

  title: {
    marginTop: spacing.lg,
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
  },

  message: {
    maxWidth: 320,
    marginTop: spacing.xs,
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
});
