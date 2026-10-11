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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RecentJobOrders } from "@/components/dashboard/RecentJobOrders";
import { PromotionCard } from "@/components/promotions/PromotionCard";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import type { Promotion } from "@/models/promotion";
import type { AppSettings } from "@/models/settings";
import {
  getSalesReport,
  type SalesReport,
  type SalesReportDateRange,
} from "@/repositories/reportRepository";
import { getAppSettings } from "@/repositories/settingsRepository";
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
    description: "View sales, expenses and daily totals",
    icon: "bar-chart-outline",
    route: "/sales-report",
  },
  {
    title: "More",
    description: "Expenses, users and settings",
    icon: "ellipsis-horizontal-circle-outline",
    route: "/more",
  },
];

const MAX_CONTENT_WIDTH = 1440;
const PAGE_PADDING = 16;
const GRID_GAP = 12;
const TABLET_BREAKPOINT = 768;

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayLabel(): string {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
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
  if (user?.fullName?.trim()) return user.fullName.trim();
  if (user?.username?.trim()) return user.username.trim();

  return "User";
}

export default function POSScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { user } = useAuth();

  const [viewportWidth, setViewportWidth] = useState(0);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loadingPromotion, setLoadingPromotion] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const actualViewportWidth = viewportWidth || width;
  const isTablet = actualViewportWidth >= TABLET_BREAKPOINT;
  const isLandscapeTablet = isTablet && actualViewportWidth > height;

  // Measure the content viewport rather than assuming the device's
  // full screen width. This accounts for the tablet's left navigation.
  const contentWidth = Math.min(actualViewportWidth, MAX_CONTENT_WIDTH);
  const availableWidth = Math.max(0, contentWidth - PAGE_PADDING * 2);

  const summaryColumns = isLandscapeTablet ? 5 : isTablet ? 3 : 2;
  const summaryCardWidth =
    (availableWidth - GRID_GAP * (summaryColumns - 1)) / summaryColumns;

  const toolColumns = isLandscapeTablet ? 2 : 1;
  const toolColumnWidth =
    (availableWidth - GRID_GAP * (toolColumns - 1)) / toolColumns;

  const quickAccessColumns = 2;
  const quickAccessCardWidth = Math.max(
    0,
    (toolColumnWidth - GRID_GAP * (quickAccessColumns - 1)) /
      quickAccessColumns,
  );

  const loadTodayReport = useCallback(async () => {
    try {
      setLoadingReport(true);

      const today = getTodayDate();
      const dateRange: SalesReportDateRange = {
        startDate: today,
        endDate: today,
      };

      setReport(await getSalesReport(dateRange));
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

  const loadSettings = useCallback(async () => {
    try {
      setLoadingSettings(true);
      setSettings(await getAppSettings());
    } catch (error) {
      console.error("Failed to load dashboard shop settings:", error);
      setSettings(null);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTodayReport();
      void loadPromotion();
      void loadSettings();
    }, [loadTodayReport, loadPromotion, loadSettings]),
  );

  const displayName = getDisplayName(user);
  const summary = report?.summary;
  const configuredShopName = settings?.shopName?.trim();
  const shopName = loadingSettings
    ? "Loading shop..."
    : configuredShopName || "Your Shop";

  const showPromotion = !loadingPromotion && promotion !== null;

  return (
    <ScrollView
      style={styles.container}
      onLayout={(event) => {
        const measuredWidth = event.nativeEvent.layout.width;
        setViewportWidth((current) =>
          Math.abs(current - measuredWidth) > 1 ? measuredWidth : current,
        );
      }}
      contentContainerStyle={[
        styles.contentContainer,
        {
          maxWidth: MAX_CONTENT_WIDTH,
          width: "100%",
          alignSelf: "center",
          paddingHorizontal: PAGE_PADDING,
          paddingTop: insets.top + spacing.md,
          paddingBottom: Math.max(insets.bottom, spacing["2xl"]),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Dashboard header */}
      <View
        style={[styles.header, isLandscapeTablet && styles.headerLandscape]}
      >
        <View style={styles.headerMain}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Ionicons name="shirt-outline" size={26} color={colors.primary} />
            </View>

            <View style={styles.brandTextContainer}>
              <Text style={styles.brandTitle} numberOfLines={2}>
                {shopName}
              </Text>
              <Text style={styles.brandSubtitle}>BUSINESS DASHBOARD</Text>
            </View>
          </View>

          <Text style={styles.welcomeText}>Good day, {displayName}!</Text>

          <Text style={styles.headerSubtitle}>
            Here's what's happening with your laundry business today.
          </Text>

          <Text style={styles.dateText}>{getTodayLabel()}</Text>
        </View>

        <Pressable
          onPress={() => router.push("/new-job-order")}
          style={({ pressed }) => [
            styles.createButton,
            isLandscapeTablet && styles.createButtonLandscape,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="add-circle-outline" size={23} color={colors.white} />
          <Text style={styles.createButtonText}>Create New Job Order</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </Pressable>
      </View>

      {/* Today's overview */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <Text style={styles.sectionSubtitle}>
            A quick look at your shop's performance
          </Text>
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
        />

        <SummaryCard
          label="Collected"
          value={formatCurrency(summary?.collected ?? 0)}
          description="Payments received"
          icon="cash-outline"
          accent="success"
          width={summaryCardWidth}
        />

        <SummaryCard
          label="Outstanding"
          value={formatCurrency(summary?.outstanding ?? 0)}
          description="Remaining balance"
          icon="time-outline"
          accent="warning"
          width={summaryCardWidth}
        />

        <SummaryCard
          label="Job Orders"
          value={String(summary?.jobOrderCount ?? 0)}
          description="Orders today"
          icon="receipt-outline"
          accent="primary"
          width={summaryCardWidth}
        />

        <SummaryCard
          label="Expenses"
          value={formatCurrency(summary?.totalExpenses ?? 0)}
          description="Recorded today"
          icon="wallet-outline"
          accent="danger"
          width={summaryCardWidth}
        />
      </View>

      {/* Recent job orders */}
      <View style={styles.recentOrdersSection}>
        <RecentJobOrders />
      </View>

      {/* Promotions and quick access */}
      <View
        style={[
          styles.dashboardTools,
          isLandscapeTablet && styles.dashboardToolsLandscape,
        ]}
      >
        {showPromotion && promotion && (
          <View
            style={[
              styles.toolColumn,
              { width: toolColumnWidth, maxWidth: toolColumnWidth },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Promotions</Text>
                <Text style={styles.sectionSubtitle}>
                  Featured offers for your customers
                </Text>
              </View>
            </View>

            <View style={styles.promotionContainer}>
              <PromotionCard promotion={promotion} />
            </View>
          </View>
        )}

        <View
          style={[
            styles.toolColumn,
            showPromotion
              ? {
                  width: toolColumnWidth,
                  maxWidth: toolColumnWidth,
                }
              : {
                  width: "100%",
                },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Quick Access</Text>
              <Text style={styles.sectionSubtitle}>
                Get to everyday tasks faster
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
                  { width: quickAccessCardWidth },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.quickAccessIcon}>
                  <Ionicons name={item.icon} size={23} color={colors.primary} />
                </View>

                <Text style={styles.quickAccessTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                <Text style={styles.quickAccessDescription} numberOfLines={2}>
                  {item.description}
                </Text>

                <View style={styles.quickAccessArrow}>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={colors.primary}
                  />
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
}: {
  label: string;
  value: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: "primary" | "success" | "warning" | "danger";
  width: number;
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
    <View style={[styles.summaryCard, { width }]}>
      <View style={[styles.summaryIcon, { backgroundColor: accentBackground }]}>
        <Ionicons name={icon} size={21} color={accentColor} />
      </View>

      <Text style={styles.summaryLabel} numberOfLines={2}>
        {label}
      </Text>

      <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>

      <Text style={styles.summaryDescription} numberOfLines={2}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.background,
  },

  contentContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing["3xl"],
  },

  header: {
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing["2xl"],
    gap: spacing.lg,
  },

  headerLandscape: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.xl,
  },

  headerMain: {
    flex: 1,
    minWidth: 0,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  brandTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  brandTitle: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "700",
    color: colors.text,
  },

  brandSubtitle: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.1,
    marginTop: 3,
  },

  welcomeText: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },

  dateText: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  createButton: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },

  createButtonLandscape: {
    minWidth: 0,
    maxWidth: 260,
    flexShrink: 1,
    alignSelf: "center",
    marginLeft: spacing.lg,
  },

  createButtonText: {
    ...typography.bodyMedium,
    color: colors.white,
    flexShrink: 1,
  },

  sectionHeader: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },

  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },

  sectionSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 3,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: GRID_GAP,
  },

  summaryCard: {
    minWidth: 0,
    minHeight: 148,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },

  summaryLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
    minHeight: 20,
  },

  summaryValue: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.xs,
  },

  summaryDescription: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  recentOrdersSection: {
    minWidth: 0,
    marginTop: spacing["2xl"],
  },

  dashboardTools: {
    minWidth: 0,
    marginTop: spacing["2xl"],
    gap: spacing.xl,
  },

  dashboardToolsLandscape: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: GRID_GAP,
  },

  toolColumn: {
    minWidth: 0,
    flexShrink: 1,
  },

  promotionContainer: {
    minWidth: 0,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },

  quickAccessGrid: {
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },

  quickAccessCard: {
    minWidth: 0,
    minHeight: 150,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  quickAccessIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },

  quickAccessTitle: {
    ...typography.h3,
    color: colors.text,
  },

  quickAccessDescription: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: spacing.xs,
  },

  quickAccessArrow: {
    alignSelf: "flex-end",
    marginTop: spacing.sm,
  },

  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
