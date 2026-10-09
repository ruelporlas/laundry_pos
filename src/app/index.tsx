import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { PromotionCard } from "@/components/promotions/PromotionCard";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import type { Promotion } from "@/models/promotion";
import {
  getSalesReport,
  type SalesReport,
  type SalesReportDateRange,
} from "@/repositories/reportRepository";
import { getPromotions } from "@/services/promotionService";

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
    title: "Inventory",
    description: "Manage stock and inventory",
    icon: "file-tray-stacked-outline",
    route: "/inventory",
  },
  {
    title: "Reports",
    description: "View sales, expenses & daily totals",
    icon: "bar-chart-outline",
    route: "/sales-report",
  },
  {
    title: "More",
    description: "Expenses, users & settings",
    icon: "ellipsis-horizontal-circle-outline",
    route: "/more",
  },
];

const MAX_CONTENT_WIDTH = 1200;
const PAGE_PADDING = 16;
const GRID_GAP = 16;

function getTodayDate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getDisplayName(
  user: {
    fullName?: string | null;
    username?: string | null;
  } | null,
): string {
  if (user?.fullName?.trim()) {
    return user.fullName.trim();
  }

  if (user?.username?.trim()) {
    return user.username.trim();
  }

  return "User";
}

export default function POSScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  const [report, setReport] = useState<SalesReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);

  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loadingPromotion, setLoadingPromotion] = useState(true);

  const isTablet = width >= 768;

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const availableWidth = contentWidth - PAGE_PADDING * 2;

  const numColumns = isTablet ? 4 : 2;

  const quickAccessCardWidth =
    (availableWidth - GRID_GAP * (numColumns - 1)) / numColumns;

  const summaryCardWidth = isTablet
    ? (availableWidth - GRID_GAP * 4) / 5
    : (availableWidth - GRID_GAP) / 2;

  const dashboardHalfWidth = (availableWidth - GRID_GAP) / 2;

  const loadTodayReport = useCallback(async () => {
    try {
      setLoadingReport(true);

      const today = getTodayDate();

      const dateRange: SalesReportDateRange = {
        startDate: today,
        endDate: today,
      };

      const result = await getSalesReport(dateRange);

      setReport(result);
    } catch (error) {
      console.error("Failed to load today's dashboard report:", error);
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  }, []);

  const loadPromotion = useCallback(async () => {
    try {
      setLoadingPromotion(true);

      const result = await getPromotions();

      if (!result.enabled || result.promotions.length === 0) {
        setPromotion(null);
        return;
      }

      setPromotion(result.promotions[0]);
    } catch (error) {
      console.error("Failed to load promotion:", error);
      setPromotion(null);
    } finally {
      setLoadingPromotion(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTodayReport();
      loadPromotion();
    }, [loadTodayReport, loadPromotion]),
  );

  const displayName = getDisplayName(user);
  const summary = report?.summary;

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

        <Text style={styles.welcomeText}>Welcome back, {displayName}</Text>

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

      {/* Today's Overview */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>Today&apos;s Overview</Text>

          <Text style={styles.sectionSubtitle}>September 30, 2026</Text>
        </View>

        {loadingReport && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>

      <View style={styles.summaryGrid}>
        <SummaryCard
          label="Today's Sales"
          value={formatCurrency(summary?.netSales ?? 0)}
          description="Net sales today"
          icon="trending-up-outline"
          accent="primary"
          width={summaryCardWidth}
          tablet={isTablet}
        />

        <SummaryCard
          label="Collected"
          value={formatCurrency(summary?.collected ?? 0)}
          description="Payments received"
          icon="cash-outline"
          accent="success"
          width={summaryCardWidth}
          tablet={isTablet}
        />

        <SummaryCard
          label="Outstanding"
          value={formatCurrency(summary?.outstanding ?? 0)}
          description="Remaining balance"
          icon="time-outline"
          accent="warning"
          width={summaryCardWidth}
          tablet={isTablet}
        />

        <SummaryCard
          label="Job Orders"
          value={String(summary?.jobOrderCount ?? 0)}
          description="Orders today"
          icon="receipt-outline"
          accent="primary"
          width={summaryCardWidth}
          tablet={isTablet}
        />

        <SummaryCard
          label="Expenses"
          value={formatCurrency(summary?.totalExpenses ?? 0)}
          description="Recorded today"
          icon="wallet-outline"
          accent="danger"
          width={isTablet ? summaryCardWidth : availableWidth}
          tablet={isTablet}
          fullWidth={!isTablet}
        />
      </View>

      {/* Promotion + Quick Access */}
      <View
        style={[styles.dashboardTools, isTablet && styles.dashboardToolsTablet]}
      >
        {/* Promotion */}
        {!loadingPromotion && promotion && (
          <View
            style={[
              styles.promotionColumn,
              isTablet && {
                width: dashboardHalfWidth,
              },
            ]}
          >
            <View style={styles.compactSectionHeader}>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>For Your Laundry</Text>

                <Text style={styles.sectionSubtitle}>
                  Useful services for your shop
                </Text>
              </View>
            </View>

            <PromotionCard promotion={promotion} />
          </View>
        )}

        {/* Quick Access */}
        <View
          style={[
            styles.quickAccessColumn,
            isTablet && {
              width: promotion ? dashboardHalfWidth : "100%",
            },
          ]}
        >
          <View style={styles.compactSectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Quick Access</Text>

              <Text style={styles.sectionSubtitle}>
                Manage your laundry shop
              </Text>
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
                    width: isTablet
                      ? promotion
                        ? (dashboardHalfWidth - GRID_GAP) / 2
                        : (availableWidth - GRID_GAP) / 2
                      : quickAccessCardWidth,
                  },
                  isTablet && styles.quickAccessCardTablet,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.quickAccessTop}>
                  <View style={styles.quickAccessIcon}>
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.quickAccessArrow}>
                    <Ionicons
                      name="arrow-forward"
                      size={15}
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
        </View>
      </View>
    </ScrollView>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon,
  accent,
  width,
  tablet,
  fullWidth = false,
}: {
  label: string;
  value: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: "primary" | "success" | "warning" | "danger";
  width: number;
  tablet: boolean;
  fullWidth?: boolean;
}) {
  const accentColor =
    accent === "danger"
      ? colors.danger
      : accent === "success"
        ? colors.success
        : accent === "warning"
          ? colors.warning
          : colors.primary;

  const accentBackground =
    accent === "danger"
      ? colors.dangerLight
      : accent === "success"
        ? colors.successLight
        : accent === "warning"
          ? colors.warningLight
          : colors.primaryLight;

  return (
    <View
      style={[
        styles.summaryCard,
        {
          width: fullWidth ? "100%" : width,
        },
        tablet && styles.summaryCardTablet,
      ]}
    >
      <View style={styles.summaryCardTop}>
        <View
          style={[
            styles.summaryIcon,
            {
              backgroundColor: accentBackground,
            },
          ]}
        >
          <Ionicons name={icon} size={20} color={accentColor} />
        </View>
      </View>

      <Text
        style={[
          styles.summaryLabel,
          accent === "danger" && styles.summaryLabelDanger,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[styles.summaryValue, tablet && styles.summaryValueTablet]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      <Text style={styles.summaryDescription}>{description}</Text>
    </View>
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

  welcomeText: {
    ...typography.bodyMedium,
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  heroSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  compactSectionHeader: {
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 42,
  },

  sectionHeaderText: {
    flex: 1,
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

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: GRID_GAP,
  },

  summaryCard: {
    minHeight: 154,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  summaryCardTablet: {
    minHeight: 170,
  },

  summaryCardTop: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: spacing.md,
  },

  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  summaryLabelDanger: {
    color: colors.danger,
  },

  summaryValue: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.xs,
  },

  summaryValueTablet: {
    fontSize: 22,
  },

  summaryDescription: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  dashboardTools: {
    marginTop: spacing["2xl"],
    gap: spacing["2xl"],
  },

  dashboardToolsTablet: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: GRID_GAP,
  },

  promotionColumn: {
    width: "100%",
  },

  quickAccessColumn: {
    width: "100%",
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

  quickAccessCardTablet: {
    minHeight: 140,
    padding: spacing.md,
  },

  quickAccessTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  quickAccessIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  quickAccessArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  quickAccessContent: {
    marginTop: spacing.md,
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
