import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import type { Expense } from "@/models/expense";
import { getExpenses } from "@/repositories/expenseRepository";

const GRID_GAP = spacing.lg;
const MAX_CONTENT_WIDTH = 1200;

export default function ExpensesScreen() {
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);

  const availableWidth = contentWidth - PAGE_PADDING * 2;

  const cardWidth = isTablet
    ? Math.max(0, (availableWidth - GRID_GAP) / 2)
    : undefined;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    try {
      setError(null);

      const result = await getExpenses();

      setExpenses(result);
    } catch (error) {
      console.error("Failed to load expenses:", error);

      setError(
        error instanceof Error ? error.message : "Unable to load expenses.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      setError(null);

      const result = await getExpenses();

      setExpenses(result);
    } catch (error) {
      console.error("Failed to refresh expenses:", error);

      setError(
        error instanceof Error ? error.message : "Unable to refresh expenses.",
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return expenses;
    }

    return expenses.filter((expense) => {
      return (
        expense.categoryName.toLowerCase().includes(query) ||
        expense.description.toLowerCase().includes(query) ||
        expense.notes.toLowerCase().includes(query) ||
        expense.expenseDate.toLowerCase().includes(query)
      );
    });
  }, [expenses, search]);

  const renderExpense = useCallback(
    ({ item }: { item: Expense }) => (
      <AppCard
        onPress={() =>
          router.push({
            pathname: "/expense-details",
            params: {
              id: item.id.toString(),
            },
          })
        }
        style={[
          styles.expenseCard,
          isTablet && {
            width: cardWidth,
          },
        ]}
      >
        <View
          style={[
            styles.expenseIcon,
            item.isVoided && styles.expenseIconVoided,
          ]}
        >
          <Ionicons
            name="receipt-outline"
            size={22}
            color={item.isVoided ? colors.danger : colors.primary}
          />
        </View>

        <View style={styles.expenseInfo}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryName} numberOfLines={1}>
              {item.categoryName}
            </Text>

            {item.isVoided ? (
              <StatusBadge label="Voided" variant="danger" />
            ) : null}
          </View>

          <Text style={styles.description} numberOfLines={1}>
            {item.description || "No description"}
          </Text>

          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.textMuted}
            />

            <Text style={styles.dateText}>{item.expenseDate}</Text>
          </View>
        </View>

        <View style={styles.expenseRight}>
          <Text style={[styles.amount, item.isVoided && styles.amountVoided]}>
            ₱{item.amount.toFixed(2)}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textMuted}
          style={styles.chevron}
        />
      </AppCard>
    ),
    [cardWidth, isTablet],
  );

  const renderListHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.heroWrapper}>
        <PageHero
          icon="receipt-outline"
          title="Expenses"
          subtitle="Track and manage your shop expenses"
        />
      </View>

      <View style={styles.controls}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search expenses..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />

          {search.length > 0 ? (
            <View style={styles.resultCount}>
              <Text style={styles.resultCountText}>
                {filteredExpenses.length}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.actionRow, !isTablet && styles.actionRowMobile]}>
          <View style={styles.sectionHeaderWrapper}>
            <SectionHeader
              icon="receipt-outline"
              title="Expense List"
              subtitle={`${filteredExpenses.length} ${
                filteredExpenses.length === 1 ? "expense" : "expenses"
              }`}
            />
          </View>

          <AppButton
            title="Add Expense"
            icon="add"
            onPress={() => router.push("/add-expense")}
            fullWidth={!isTablet}
          />
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingState message="Loading expenses..." />
      </View>
    );
  }

  if (error && expenses.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.errorScreen}>
          <ErrorState title="Unable to load expenses" message={error} />

          <Pressable
            onPress={loadExpenses}
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
        data={filteredExpenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpense}
        numColumns={isTablet ? 2 : 1}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="receipt-outline"
              title={search.trim() ? "No expenses found" : "No expenses yet"}
              message={
                search.trim()
                  ? "Try searching with a different category or description."
                  : "Add your first expense to start tracking shop expenses."
              }
            />
          </View>
        }
        columnWrapperStyle={isTablet ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.list}
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

      {error && expenses.length > 0 ? (
        <View style={styles.refreshError}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />

          <Text style={styles.refreshErrorText}>{error}</Text>

          <Pressable
            onPress={loadExpenses}
            accessibilityRole="button"
            accessibilityLabel="Retry loading expenses"
          >
            <Text style={styles.refreshErrorAction}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
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
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: spacing["4xl"],
  },

  headerContent: {
    paddingTop: 0,
  },

  heroWrapper: {
    marginHorizontal: -PAGE_PADDING,
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
    gap: spacing.md,
  },

  actionRowMobile: {
    flexDirection: "column",
    alignItems: "stretch",
  },

  sectionHeaderWrapper: {
    flex: 1,
    minWidth: 0,
  },

  columnWrapper: {
    justifyContent: "space-between",
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  expenseCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 82,
    marginBottom: spacing.md,
  },

  expenseIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  expenseIconVoided: {
    backgroundColor: colors.dangerLight,
  },

  expenseInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.md,
    marginRight: spacing.md,
  },

  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  categoryName: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text,
  },

  description: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.textSecondary,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: spacing.xs,
  },

  dateText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  expenseRight: {
    alignItems: "flex-end",
    marginRight: spacing.sm,
  },

  amount: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  amountVoided: {
    color: colors.danger,
    textDecorationLine: "line-through",
  },

  chevron: {
    marginLeft: spacing.xs,
  },

  emptyContainer: {
    paddingTop: spacing.md,
  },

  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING,
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 44,
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
    marginHorizontal: PAGE_PADDING,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
