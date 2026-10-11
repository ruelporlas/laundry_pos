import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import {
  getJobOrders,
  type JobOrderListItem,
} from "@/repositories/jobOrderRepository";

function getLocalDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

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

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatusLabel(order: JobOrderListItem): string {
  if (order.isVoided) return "Voided";

  switch (order.paymentStatus) {
    case "paid":
      return "Paid";
    case "partially_paid":
      return "Partial";
    case "unpaid":
      return "Unpaid";
    default:
      return "Unknown";
  }
}

function getStatusColors(order: JobOrderListItem): {
  background: string;
  foreground: string;
} {
  if (order.isVoided) {
    return {
      background: colors.dangerLight,
      foreground: colors.danger,
    };
  }

  switch (order.paymentStatus) {
    case "paid":
      return {
        background: colors.successLight,
        foreground: colors.success,
      };
    case "partially_paid":
      return {
        background: colors.warningLight,
        foreground: colors.warning,
      };
    default:
      return {
        background: colors.dangerLight,
        foreground: colors.danger,
      };
  }
}

export function RecentJobOrders() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const isPhone = windowWidth < 768;

  const [orders, setOrders] = useState<JobOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setLoadFailed(false);

      const result = await getJobOrders();
      const today = getLocalDateKey(new Date());

      const todaysOrders = result.filter(
        (order) =>
          !order.isVoided && getLocalDateKey(order.createdAt) === today,
      );

      setOrders(todaysOrders);
    } catch (error) {
      console.error("Failed to load today's job orders:", error);
      setLoadFailed(true);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  );

  function openOrder(order: JobOrderListItem) {
    router.push({
      pathname: "/orders",
      params: { jobOrderId: String(order.id) },
    });
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="receipt-outline" size={21} color={colors.primary} />
        </View>

        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Today's Job Orders</Text>
            {!loading && !loadFailed && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{orders.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>Job orders recorded today</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/orders")}
          style={({ pressed }) => [
            styles.viewAllButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.viewAllText}>View all</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.message}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.messageText}>Loading today's job orders...</Text>
        </View>
      ) : loadFailed ? (
        <View style={styles.message}>
          <Ionicons
            name="alert-circle-outline"
            size={25}
            color={colors.danger}
          />
          <Text style={styles.messageText}>
            Could not load job orders. Please try again later.
          </Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.message}>
          <Ionicons
            name="file-tray-outline"
            size={30}
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>No job orders today</Text>
          <Text style={styles.messageText}>
            Job orders created today will appear here.
          </Text>
        </View>
      ) : isPhone ? (
        <View style={styles.mobileList}>
          {orders.map((order) => {
            const statusColors = getStatusColors(order);

            return (
              <Pressable
                key={order.id}
                accessibilityRole="button"
                onPress={() => openOrder(order)}
                style={({ pressed }) => [
                  styles.mobileOrder,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.mobileTopRow}>
                  <Text style={styles.orderNumber} numberOfLines={1}>
                    {order.jobOrderNumber}
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusColors.foreground },
                      ]}
                    >
                      {getStatusLabel(order)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.mobileCustomerName}>
                  {order.customerName}
                </Text>

                <View style={styles.mobileDetailsRow}>
                  <View style={styles.mobileDetail}>
                    <Text style={styles.mobileLabel}>DATE</Text>
                    <Text style={styles.dateText}>
                      {formatDate(order.createdAt)}
                    </Text>
                  </View>

                  <View style={[styles.mobileDetail, styles.mobileTotal]}>
                    <Text style={styles.mobileLabel}>TOTAL</Text>
                    <Text style={styles.amountText}>
                      {formatCurrency(order.total)}
                    </Text>
                  </View>
                </View>

                <View style={styles.mobileFooter}>
                  <Text style={styles.mobileFooterText}>
                    View order details
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={colors.primary}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.column, styles.orderColumn]}>
              <Text style={styles.columnHeaderText}>ORDER</Text>
            </View>
            <View style={[styles.column, styles.customerColumn]}>
              <Text style={styles.columnHeaderText}>CUSTOMER</Text>
            </View>
            <View style={[styles.column, styles.dateColumn]}>
              <Text style={styles.columnHeaderText}>DATE</Text>
            </View>
            <View style={[styles.column, styles.amountColumn]}>
              <Text style={styles.columnHeaderText}>TOTAL</Text>
            </View>
            <View style={[styles.column, styles.statusColumn]}>
              <Text style={styles.columnHeaderText}>PAYMENT</Text>
            </View>
          </View>

          {orders.map((order) => {
            const statusColors = getStatusColors(order);

            return (
              <Pressable
                key={order.id}
                accessibilityRole="button"
                onPress={() => openOrder(order)}
                style={({ pressed }) => [
                  styles.tableRow,
                  styles.dataRow,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={[styles.column, styles.orderColumn]}>
                  <Text style={styles.orderNumber} numberOfLines={1}>
                    {order.jobOrderNumber}
                  </Text>
                </View>

                <View style={[styles.column, styles.customerColumn]}>
                  <Text style={styles.customerName} numberOfLines={2}>
                    {order.customerName}
                  </Text>
                </View>

                <View style={[styles.column, styles.dateColumn]}>
                  <Text style={styles.dateText} numberOfLines={2}>
                    {formatDate(order.createdAt)}
                  </Text>
                </View>

                <View style={[styles.column, styles.amountColumn]}>
                  <Text style={styles.amountText} numberOfLines={1}>
                    {formatCurrency(order.total)}
                  </Text>
                </View>

                <View style={[styles.column, styles.statusColumn]}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusColors.foreground },
                      ]}
                    >
                      {getStatusLabel(order)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  title: {
    ...typography.h3,
    color: colors.text,
  },

  countBadge: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: spacing.sm,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: "800",
  },

  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 3,
  },

  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
  },

  viewAllText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: "600",
  },

  mobileList: {
    width: "100%",
  },

  mobileOrder: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },

  mobileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },

  mobileCustomerName: {
    ...typography.bodyMedium,
    color: colors.text,
    flexShrink: 1,
  },

  mobileDetailsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },

  mobileDetail: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },

  mobileTotal: {
    alignItems: "flex-start",
  },

  mobileLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: colors.textMuted,
  },

  mobileFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingTop: spacing.xs,
  },

  mobileFooterText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: "600",
  },

  table: {
    width: "100%",
    alignSelf: "stretch",
  },

  tableRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },

  tableHeader: {
    minHeight: 44,
    backgroundColor: colors.surfaceSoft,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },

  column: {
    minWidth: 0,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },

  columnHeaderText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.textSecondary,
  },

  orderColumn: {
    flex: 1.05,
  },

  customerColumn: {
    flex: 1.5,
  },

  dateColumn: {
    flex: 1.25,
  },

  amountColumn: {
    flex: 1.05,
    alignItems: "flex-start",
  },

  statusColumn: {
    flex: 0.95,
    alignItems: "flex-start",
  },

  dataRow: {
    minHeight: 62,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  orderNumber: {
    ...typography.small,
    color: colors.primary,
    fontWeight: "700",
    flexShrink: 1,
  },

  customerName: {
    ...typography.bodyMedium,
    color: colors.text,
    flexShrink: 1,
  },

  dateText: {
    ...typography.small,
    color: colors.textSecondary,
    flexShrink: 1,
  },

  amountText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: "600",
    flexShrink: 1,
  },

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },

  statusText: {
    ...typography.small,
    fontWeight: "600",
  },

  rowPressed: {
    backgroundColor: colors.primaryLight,
  },

  message: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm,
  },

  emptyTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  messageText: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
  },

  pressed: {
    opacity: 0.75,
  },
});
