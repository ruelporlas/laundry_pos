import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

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
  const [orders, setOrders] = useState<JobOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        setLoading(true);
        setLoadFailed(false);

        const result = await getJobOrders();

        if (active) {
          setOrders(result.filter((order) => !order.isVoided).slice(0, 8));
        }
      } catch (error) {
        console.error("Failed to load recent job orders:", error);

        if (active) {
          setLoadFailed(true);
          setOrders([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="receipt-outline" size={21} color={colors.primary} />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>Recent Job Orders</Text>
          <Text style={styles.subtitle}>Your latest customer transactions</Text>
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
          <Text style={styles.messageText}>Loading recent orders...</Text>
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
          <Text style={styles.emptyTitle}>No job orders yet</Text>
          <Text style={styles.messageText}>
            New customer transactions will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tableScroll}
        >
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.column, styles.orderColumn]}>ORDER</Text>
              <Text style={[styles.column, styles.customerColumn]}>
                CUSTOMER
              </Text>
              <Text style={[styles.column, styles.dateColumn]}>DATE</Text>
              <Text style={[styles.column, styles.amountColumn]}>TOTAL</Text>
              <Text style={[styles.column, styles.statusColumn]}>PAYMENT</Text>
            </View>

            {orders.map((order) => {
              const statusColors = getStatusColors(order);

              return (
                <Pressable
                  key={order.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/orders",
                      params: { jobOrderId: String(order.id) },
                    })
                  }
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
                    <Text style={styles.customerName} numberOfLines={1}>
                      {order.customerName}
                    </Text>
                  </View>

                  <View style={[styles.column, styles.dateColumn]}>
                    <Text style={styles.dateText} numberOfLines={1}>
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
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  },

  title: {
    ...typography.h3,
    color: colors.text,
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

  tableScroll: {
    flexGrow: 1,
  },

  table: {
    minWidth: 680,
    flexGrow: 1,
  },

  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },

  tableHeader: {
    minHeight: 42,
    backgroundColor: colors.surfaceSoft,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },

  column: {
    paddingHorizontal: spacing.xs,
    justifyContent: "center",
  },

  orderColumn: {
    width: 135,
  },

  customerColumn: {
    width: 165,
  },

  dateColumn: {
    width: 145,
  },

  amountColumn: {
    width: 125,
    alignItems: "flex-end",
  },

  statusColumn: {
    width: 105,
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
  },

  customerName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  dateText: {
    ...typography.small,
    color: colors.textSecondary,
  },

  amountText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: "600",
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
