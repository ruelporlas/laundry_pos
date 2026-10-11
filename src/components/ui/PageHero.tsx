import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (disabled) return;

    if (onBack) {
      onBack();
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const handleDashboard = () => {
    router.replace("/");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityState={{ disabled }}
          hitSlop={8}
          style={({ pressed }) => [
            styles.navigationButton,
            pressed && !disabled && styles.buttonPressed,
            disabled && styles.buttonDisabled,
          ]}
        >
          <Ionicons name="arrow-back" size={21} color={colors.text} />
        </Pressable>

        <View style={styles.heading}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>

          {subtitle ? (
            <Text numberOfLines={2} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={handleDashboard}
          accessibilityRole="button"
          accessibilityLabel="Go to Dashboard"
          hitSlop={8}
          style={({ pressed }) => [
            styles.dashboardButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons name="home-outline" size={19} color={colors.primary} />
        </Pressable>
      </View>

      {children ? <View style={styles.customContent}>{children}</View> : null}

      <View style={styles.pageIcon} pointerEvents="none">
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  navigationButton: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.background,
  },

  heading: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },

  title: {
    ...typography.h2,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.text,
  },

  subtitle: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },

  dashboardButton: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
  },

  buttonPressed: {
    opacity: 0.65,
  },

  buttonDisabled: {
    opacity: 0.4,
  },

  customContent: {
    marginTop: spacing.sm,
  },

  pageIcon: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
});
