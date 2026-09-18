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
  View,
  useWindowDimensions,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { theme } from "@/constants/theme";
import type { Product } from "@/models/product";
import { getProducts } from "@/repositories/productRepository";

const PAGE_PADDING = 16;
const GRID_GAP = 16;

export default function ProductsScreen() {
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setError(null);

      const result = await getProducts();

      setProducts(result);
    } catch (error) {
      console.error("Failed to load products:", error);

      setError(
        error instanceof Error ? error.message : "Unable to load products.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      setError(null);

      const result = await getProducts();

      setProducts(result);
    } catch (error) {
      console.error("Failed to refresh products:", error);

      setError(
        error instanceof Error ? error.message : "Unable to refresh products.",
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query)
      );
    });
  }, [products, search]);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <AppCard
        onPress={() =>
          router.push({
            pathname: "/product-details",
            params: {
              id: item.id.toString(),
            },
          })
        }
        style={[styles.productCard, isTablet && styles.productCardTablet]}
      >
        <View style={styles.productIcon}>
          <Ionicons name="cube-outline" size={22} color={colors.primary} />
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>

          <Text style={styles.description} numberOfLines={1}>
            {item.description || "No description"}
          </Text>
        </View>

        <View style={styles.productRight}>
          <Text style={styles.price}>₱{item.price.toFixed(2)}</Text>

          <StatusBadge
            label={item.isActive ? "Active" : "Inactive"}
            variant={item.isActive ? "success" : "neutral"}
          />
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textMuted}
          style={styles.chevron}
        />
      </AppCard>
    ),
    [isTablet],
  );

  const renderListHeader = () => (
    <>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="cube-outline" size={28} color={colors.primary} />
        </View>

        <Text style={styles.title}>Products</Text>

        <Text style={styles.subtitle}>Manage your laundry products</Text>
      </View>

      <View style={[styles.content, isTablet && styles.contentTablet]}>
        <View style={styles.actionRow}>
          <View style={styles.actionRowText}>
            <Text style={styles.sectionTitle}>Product List</Text>

            <Text style={styles.sectionCount}>
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "product" : "products"}
            </Text>
          </View>

          <AppButton
            title="Add Product"
            icon="add"
            onPress={() => router.push("/add-product")}
          />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />

          {search.length > 0 && (
            <View style={styles.resultCount}>
              <Text style={styles.resultCountText}>
                {filteredProducts.length}
              </Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />

          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </View>
    );
  }

  if (error && products.length === 0) {
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

          <Text style={styles.errorTitle}>Unable to load products</Text>

          <Text style={styles.errorMessage}>{error}</Text>

          <Pressable
            onPress={loadProducts}
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
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProduct}
        numColumns={isTablet ? 2 : 1}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <View
            style={[
              styles.emptyContainer,
              isTablet && styles.emptyContainerTablet,
            ]}
          >
            <EmptyState
              icon="cube-outline"
              title={search.trim() ? "No products found" : "No products yet"}
              message={
                search.trim()
                  ? "Try searching with a different product name or description."
                  : "Add your first product to get started."
              }
            />
          </View>
        }
        columnWrapperStyle={isTablet ? styles.columnWrapper : undefined}
        contentContainerStyle={[styles.list, isTablet && styles.listTablet]}
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

      {error && products.length > 0 && (
        <View style={styles.refreshError}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />

          <Text style={styles.refreshErrorText}>{error}</Text>

          <Pressable
            onPress={loadProducts}
            accessibilityRole="button"
            accessibilityLabel="Retry loading products"
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

  hero: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: theme.radius["2xl"],
    borderBottomRightRadius: theme.radius["2xl"],
    backgroundColor: colors.primaryLight,
  },

  heroIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.white,
  },

  title: {
    marginTop: spacing.md,
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

  content: {
    width: "100%",
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.xl,
  },

  contentTablet: {
    maxWidth: 1200,
    alignSelf: "center",
    paddingHorizontal: spacing["2xl"],
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },

  actionRowText: {
    flex: 1,
    marginRight: spacing.lg,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },

  sectionCount: {
    marginTop: 2,
    ...typography.small,
    color: colors.textMuted,
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

  list: {
    paddingBottom: spacing["4xl"],
  },

  listTablet: {
    paddingHorizontal: spacing["2xl"],
  },

  columnWrapper: {
    gap: GRID_GAP,
    maxWidth: 1200,
    alignSelf: "center",
  },

  productCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 76,
    marginHorizontal: PAGE_PADDING,
    marginBottom: spacing.sm,
  },

  productCardTablet: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: spacing.md,
  },

  productIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  productInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.md,
    marginRight: spacing.md,
  },

  productName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  description: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.textMuted,
  },

  productRight: {
    alignItems: "flex-end",
    marginRight: spacing.sm,
  },

  price: {
    marginBottom: spacing.xs,
    ...typography.bodyMedium,
    color: colors.text,
  },

  chevron: {
    marginLeft: spacing.xs,
  },

  emptyContainer: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.md,
  },

  emptyContainerTablet: {
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
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
    marginBottom: spacing.xl,
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
    marginHorizontal: spacing.lg,
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
