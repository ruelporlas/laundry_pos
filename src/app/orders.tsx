import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  getJobOrders,
  JobOrderListItem,
} from "@/repositories/jobOrderRepository";

const colors = {
  primary: "#8B7CF6",
  primaryLight: "#F0EDFF",
  background: "#F7F5FB",
  surface: "#FFFFFF",
  text: "#1F1D24",
  textSecondary: "#625F6B",
  textMuted: "#96929F",
  border: "#ECE9F1",
  success: "#55B97A",
  successLight: "#E8F7EE",
  warning: "#E5A83B",
  warningLight: "#FFF5DD",
  danger: "#E96D73",
  dangerLight: "#FDEBEC",
  white: "#FFFFFF",
};

const PAGE_PADDING = 20;

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusLabel(order: JobOrderListItem): string {
  if (order.isVoided) {
    return "Voided";
  }

  if (order.paymentStatus === "paid") {
    return "Paid";
  }

  if (order.paymentStatus === "partially_paid") {
    return "Partially Paid";
  }

  return "Unpaid";
}

function getStatusColors(order: JobOrderListItem) {
  if (order.isVoided) {
    return {
      background: colors.dangerLight,
      text: colors.danger,
    };
  }

  if (order.paymentStatus === "paid") {
    return {
      background: colors.successLight,
      text: colors.success,
    };
  }

  if (order.paymentStatus === "partially_paid") {
    return {
      background: colors.warningLight,
      text: colors.warning,
    };
  }

  return {
    background: colors.dangerLight,
    text: colors.danger,
  };
}

function OrderCard({
  order,
  onPress,
}: {
  order: JobOrderListItem;
  onPress: () => void;
}) {
  const statusColors = getStatusColors(order);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.orderCard,
        pressed && styles.orderCardPressed,
      ]}
    >
      <View style={styles.orderTopRow}>
        <View style={styles.orderNumberContainer}>
          <Text style={styles.orderNumber}>{order.jobOrderNumber}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusColors.background,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: statusColors.text,
              },
            ]}
          >
            {getStatusLabel(order)}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.customerRow}>
        <View style={styles.customerIcon}>
          <Ionicons name="person-outline" size={17} color={colors.primary} />
        </View>

        <Text numberOfLines={1} style={styles.customerName}>
          {order.customerName}
        </Text>
      </View>

      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatCurrency(order.total)}</Text>
        </View>

        <View style={styles.paymentSummary}>
          <Text style={styles.paymentLabel}>Paid</Text>
          <Text style={styles.paymentAmount}>
            {formatCurrency(order.amountPaid)}
          </Text>

          {order.balance > 0 && (
            <>
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(order.balance)}
              </Text>
            </>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<JobOrderListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const result = await getJobOrders();

      setOrders(result);
    } catch (err) {
      console.error("Failed to load Job Orders:", err);

      setError(
        err instanceof Error ? err.message : "Unable to load Job Orders.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  const filteredOrders = orders.filter((order) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      order.jobOrderNumber.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query)
    );
  });

  function handleOrderPress(order: JobOrderListItem) {
    router.push({
      pathname: "/job-order-created",
      params: {
        id: String(order.id),
      },
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="receipt-outline" size={28} color={colors.primary} />
        </View>

        <Text style={styles.heroTitle}>Job Orders</Text>

        <Text style={styles.heroSubtitle}>
          Sales history and payment records
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search JO number or customer"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />

            <Text style={styles.stateText}>Loading Job Orders...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color={colors.danger}
              />
            </View>

            <Text style={styles.stateTitle}>Unable to load Job Orders</Text>

            <Text style={styles.stateText}>{error}</Text>

            <Pressable onPress={() => loadOrders()} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.centerState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={search.trim() ? "search-outline" : "receipt-outline"}
                size={30}
                color={colors.primary}
              />
            </View>

            <Text style={styles.stateTitle}>
              {search.trim() ? "No matching Job Orders" : "No Job Orders yet"}
            </Text>

            <Text style={styles.stateText}>
              {search.trim()
                ? "Try searching with a different JO number or customer name."
                : "Completed sales will appear here."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <OrderCard order={item} onPress={() => handleOrderPress(item)} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadOrders(true)}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  hero: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 54,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: "center",
  },

  heroIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: colors.surface,
  },

  heroTitle: {
    marginTop: 12,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },

  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: "center",
  },

  content: {
    flex: 1,
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 16,
  },

  searchContainer: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },

  listContent: {
    paddingTop: 14,
    paddingBottom: 24,
  },

  orderCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  orderCardPressed: {
    opacity: 0.75,
  },

  orderTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  orderNumberContainer: {
    flex: 1,
    paddingRight: 12,
  },

  orderNumber: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.text,
  },

  orderDate: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },

  customerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  customerIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
  },

  customerName: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    color: colors.text,
  },

  totalRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  totalLabel: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },

  totalAmount: {
    marginTop: 2,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: colors.text,
  },

  paymentSummary: {
    flex: 1,
    alignItems: "flex-end",
    marginRight: 10,
  },

  paymentLabel: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
  },

  paymentAmount: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.success,
  },

  balanceLabel: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
  },

  balanceAmount: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.warning,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 50,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    marginBottom: 16,
  },

  errorIcon: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
    backgroundColor: colors.dangerLight,
    marginBottom: 16,
  },

  stateTitle: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },

  stateText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
  },

  retryButton: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },

  retryButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.white,
  },
});
