import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";

type PageHeroProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
};

export function PageHero({
  icon,
  title,
  subtitle,
  onBack,
  disabled = false,
  children,
}: PageHeroProps) {
  return (
    <View style={styles.hero}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityState={{ disabled }}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backButton,
            pressed && !disabled && styles.backButtonPressed,
            disabled && styles.backButtonDisabled,
          ]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}

      {children ? (
        <View style={styles.customContent}>{children}</View>
      ) : (
        <View style={styles.icon}>
          <Ionicons name={icon} size={28} color={colors.primary} />
        </View>
      )}

      <Text style={styles.title}>{title}</Text>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: "relative",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 54,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: theme.radius["2xl"],
    borderBottomRightRadius: theme.radius["2xl"],
  },

  backButton: {
    position: "absolute",
    top: 54,
    left: PAGE_PADDING,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.white,
  },

  backButtonPressed: {
    opacity: 0.7,
  },

  backButtonDisabled: {
    opacity: 0.5,
  },

  icon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.white,
  },

  customContent: {
    alignItems: "center",
  },

  title: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: "center",
  },

  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
