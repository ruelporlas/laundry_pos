import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

export default function MoreScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="settings-outline" size={30} color={colors.primary} />
        </View>

        <Text style={styles.heroTitle}>More</Text>

        <Text style={styles.heroSubtitle}>Administration and POS settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Administration</Text>

        <Pressable
          style={({ pressed }) => [styles.menuCard, pressed && styles.pressed]}
          onPress={() => router.push("/users")}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="people-outline" size={24} color={colors.primary} />
          </View>

          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>User Management</Text>

            <Text style={styles.menuSubtitle}>
              Manage staff accounts, roles, passwords and access
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingBottom: spacing["3xl"],
  },

  hero: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 54,
    paddingBottom: 24,
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  heroTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
  },

  heroSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },

  section: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.xl,
  },

  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },

  menuCard: {
    minHeight: 82,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },

  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  menuContent: {
    flex: 1,
    marginHorizontal: spacing.md,
  },

  menuTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  menuSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 3,
  },

  pressed: {
    opacity: 0.75,
  },
});
