import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { theme } from "@/constants/theme";

type QuickAccessItem = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const quickAccessItems: QuickAccessItem[] = [
  {
    title: "Orders",
    description: "View previous job orders",
    icon: "receipt-outline",
    route: "/orders",
  },
  {
    title: "Customers",
    description: "Manage customer records",
    icon: "people-outline",
    route: "/customers",
  },
  {
    title: "Products",
    description: "Manage products",
    icon: "cube-outline",
    route: "/products",
  },
  {
    title: "Services",
    description: "Manage laundry services",
    icon: "construct-outline",
    route: "/services",
  },
  {
    title: "Bundles",
    description: "Manage product packages",
    icon: "gift-outline",
    route: "/bundles",
  },
  {
    title: "More",
    description: "Expenses, reports & settings",
    icon: "ellipsis-horizontal-circle-outline",
    route: "/more",
  },
];

const MAX_CONTENT_WIDTH = 1200;
const PAGE_PADDING = 16;
const GRID_GAP = 16;

export default function POSScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);

  const availableWidth = contentWidth - PAGE_PADDING * 2;

  const numColumns = isTablet ? 3 : 2;

  const quickAccessCardWidth =
    (availableWidth - GRID_GAP * (numColumns - 1)) / numColumns;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        {
          maxWidth: MAX_CONTENT_WIDTH,
          width: "100%",
          alignSelf: "center",
          paddingHorizontal: PAGE_PADDING,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="cart-outline" size={30} color={colors.primary} />
        </View>

        <Text style={styles.heroTitle}>Laundry POS</Text>

        <Text style={styles.heroSubtitle}>
          Manage today&apos;s sales and job orders
        </Text>
      </View>

      {/* Create New Job Order */}
      <Pressable
        onPress={() => router.push("/new-job-order")}
        style={({ pressed }) => [
          styles.newJobOrderCard,
          isTablet && styles.newJobOrderCardTablet,
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.newJobOrderIcon,
            isTablet && styles.newJobOrderIconTablet,
          ]}
        >
          <Ionicons
            name="add"
            size={isTablet ? 34 : 28}
            color={colors.primary}
          />
        </View>

        <View style={styles.newJobOrderText}>
          <Text
            style={[
              styles.newJobOrderTitle,
              isTablet && styles.newJobOrderTitleTablet,
            ]}
          >
            Create New Job Order
          </Text>

          <Text style={styles.newJobOrderSubtitle}>
            Start a new customer transaction
          </Text>
        </View>

        <View style={styles.newJobOrderArrow}>
          <Ionicons name="arrow-forward" size={20} color={colors.primary} />
        </View>
      </Pressable>

      {/* Quick Access */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Quick Access</Text>

          <Text style={styles.sectionSubtitle}>Manage your laundry shop</Text>
        </View>
      </View>

      <View style={styles.quickAccessGrid}>
        {quickAccessItems.map((item) => (
          <Pressable
            key={item.title}
            onPress={() => router.push(item.route as never)}
            style={({ pressed }) => [
              styles.quickAccessCard,
              {
                width: quickAccessCardWidth,
              },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.quickAccessTop}>
              <View style={styles.quickAccessIcon}>
                <Ionicons name={item.icon} size={23} color={colors.primary} />
              </View>

              <View style={styles.quickAccessArrow}>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.quickAccessContent}>
              <Text style={styles.quickAccessTitle}>{item.title}</Text>

              <Text style={styles.quickAccessDescription} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  contentContainer: {
    paddingTop: spacing.lg,
    paddingBottom: spacing["3xl"],
  },

  hero: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },

  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },

  heroTitle: {
    ...typography.display,
    color: colors.text,
    textAlign: "center",
  },

  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  newJobOrderCard: {
    minHeight: 88,
    backgroundColor: colors.primaryLight,
    borderRadius: theme.radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  newJobOrderCardTablet: {
    minHeight: 104,
    paddingHorizontal: spacing.xl,
  },

  newJobOrderIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  newJobOrderIconTablet: {
    width: 60,
    height: 60,
    borderRadius: 20,
  },

  newJobOrderText: {
    flex: 1,
  },

  newJobOrderTitle: {
    ...typography.h3,
    color: colors.text,
  },

  newJobOrderTitleTablet: {
    fontSize: 20,
  },

  newJobOrderSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  newJobOrderArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeader: {
    marginTop: spacing["2xl"],
    marginBottom: spacing.md,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },

  sectionSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  quickAccessGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: GRID_GAP,
  },

  quickAccessCard: {
    minHeight: 148,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: spacing.lg,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
  },

  quickAccessTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  quickAccessIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  quickAccessArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  quickAccessContent: {
    marginTop: spacing.lg,
  },

  quickAccessTitle: {
    ...typography.h3,
    color: colors.text,
  },

  quickAccessDescription: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },

  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
