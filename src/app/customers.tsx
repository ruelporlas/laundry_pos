import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { theme } from "@/constants/theme";
import type { Customer } from "@/models/customer";
import { getCustomers } from "@/repositories/customerRepository";

const GRID_GAP = 16;

export default function CustomersScreen() {
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const contentWidth = Math.min(width, 1200);
  const horizontalPadding = isTablet ? spacing["2xl"] : spacing.lg;

  const availableWidth = contentWidth - horizontalPadding * 2;

  const cardWidth = isTablet
    ? Math.max(0, (availableWidth - GRID_GAP) / 2)
    : undefined;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    try {
      setError(null);

      const result = await getCustomers();

      setCustomers(result);
    } catch (error) {
      console.error("Failed to load customers:", error);

      setError(
        error instanceof Error ? error.message : "Unable to load customers.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [loadCustomers]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      setError(null);

      const result = await getCustomers();

      setCustomers(result);
    } catch (error) {
      console.error("Failed to refresh customers:", error);

      setError(
        error instanceof Error ? error.message : "Unable to refresh customers.",
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query)
      );
    });
  }, [customers, search]);

  const renderCustomer = useCallback(
    ({ item }: { item: Customer }) => (
      <AppCard
        padding={spacing.md}
        style={[
          styles.customerCard,
          isTablet && {
            width: cardWidth,
          },
        ]}
        onPress={() =>
          router.push({
            pathname: "/customer-details",
            params: {
              id: item.id.toString(),
            },
          })
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.customerInfo}>
          <Text style={styles.customerName} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={13} color={colors.textMuted} />

            <Text style={styles.phone} numberOfLines={1}>
              {item.phone || "No phone number"}
            </Text>
          </View>
        </View>

        <View style={styles.trailing}>
          <StatusBadge
            label={item.isActive ? "Active" : "Inactive"}
            variant={item.isActive ? "success" : "neutral"}
          />

          <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
        </View>
      </AppCard>
    ),
    [cardWidth, isTablet],
  );

  const renderListHeader = () => (
    <View style={styles.headerContent}>
      <View
        style={[
          styles.headerHero,
          {
            marginHorizontal: -horizontalPadding,
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        <Text style={styles.title}>Customers</Text>

        <Text style={styles.subtitle}>Manage your laundry customers</Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or phone..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />

          {search.length > 0 && (
            <View style={styles.resultCount}>
              <Text style={styles.resultCountText}>
                {filteredCustomers.length}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <View style={styles.sectionInfo}>
            <Text style={styles.sectionTitle}>Your customers</Text>

            <Text style={styles.sectionSubtitle}>
              {filteredCustomers.length}{" "}
              {filteredCustomers.length === 1 ? "customer" : "customers"}
            </Text>
          </View>

          <AppButton
            title="Add Customer"
            icon="add"
            onPress={() => router.push("/add-customer")}
          />
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />

          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      </View>
    );
  }

  if (error && customers.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.errorScreen}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={32}
              color={colors.danger}
            />
          </View>

          <Text style={styles.errorTitle}>Unable to load customers</Text>

          <Text style={styles.errorMessage}>{error}</Text>

          <Pressable
            onPress={loadCustomers}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.white} />

            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        key={isTablet ? "tablet-grid" : "phone-list"}
        data={filteredCustomers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCustomer}
        numColumns={isTablet ? 2 : 1}
        columnWrapperStyle={isTablet ? styles.columnWrapper : undefined}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={search.trim() ? "No customers found" : "No customers yet"}
            message={
              search.trim()
                ? "Try searching with a different name or phone number."
                : "Add your first customer to get started."
            }
          />
        }
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: horizontalPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      {error && customers.length > 0 && (
        <View style={styles.refreshError}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />

          <Text style={styles.refreshErrorText}>{error}</Text>

          <Pressable
            onPress={loadCustomers}
            accessibilityRole="button"
            accessibilityLabel="Retry loading customers"
          >
            <Text style={styles.refreshErrorAction}>Retry</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  list: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    paddingBottom: spacing["4xl"],
  },

  headerContent: {
    paddingTop: 0,
  },

  headerHero: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 54,
    paddingBottom: 20,
    borderBottomLeftRadius: theme.radius["2xl"],
    borderBottomRightRadius: theme.radius["2xl"],
    backgroundColor: colors.primaryLight,
  },

  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },

  subtitle: {
    marginTop: spacing.xs,
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
  },

  controls: {
    paddingTop: spacing.xl,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    paddingVertical: 0,
    ...typography.body,
    color: colors.text,
  },

  resultCount: {
    minWidth: 28,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
  },

  resultCountText: {
    ...typography.caption,
    color: colors.primary,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  sectionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },

  sectionSubtitle: {
    marginTop: 3,
    ...typography.small,
    color: colors.textMuted,
  },

  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: GRID_GAP,
  },

  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 76,
    marginBottom: spacing.md,
  },

  avatar: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
  },

  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },

  customerInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },

  customerName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: spacing.xs,
  },

  phone: {
    flexShrink: 1,
    ...typography.caption,
    color: colors.textMuted,
  },

  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
  },

  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.textMuted,
  },

  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  },

  errorIcon: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.dangerLight,
  },

  errorTitle: {
    marginTop: spacing.lg,
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
  },

  errorMessage: {
    maxWidth: 420,
    marginTop: spacing.xs,
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 44,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primary,
  },

  retryText: {
    ...typography.button,
    color: colors.white,
  },

  pressed: {
    opacity: 0.8,
  },

  refreshError: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.warningLight,
  },

  refreshErrorText: {
    flex: 1,
    ...typography.caption,
    color: colors.warning,
  },

  refreshErrorAction: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
});
