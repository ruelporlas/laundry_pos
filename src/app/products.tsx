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
import type { Product } from "@/models/product";
import { getProducts } from "@/repositories/productRepository";

const GRID_GAP = spacing.lg;
const MAX_CONTENT_WIDTH = 1200;

export default function ProductsScreen() {
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);

  const availableWidth = contentWidth - PAGE_PADDING * 2;

  const cardWidth = isTablet
    ? Math.max(0, (availableWidth - GRID_GAP) / 2)
    : undefined;

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
        style={[
          styles.productCard,
          isTablet && {
            width: cardWidth,
          },
        ]}
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
    [cardWidth, isTablet],
  );

  const renderListHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.heroWrapper}>
        <PageHero
          icon="cube-outline"
          title="Products"
          subtitle="Manage your laundry products"
        />
      </View>

      <View style={styles.controls}>
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

          {search.length > 0 ? (
            <View style={styles.resultCount}>
              <Text style={styles.resultCountText}>
                {filteredProducts.length}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.actionRow, !isTablet && styles.actionRowMobile]}>
          <View style={styles.sectionHeaderWrapper}>
            <SectionHeader
              icon="cube-outline"
              title="Product List"
              subtitle={`${filteredProducts.length} ${
                filteredProducts.length === 1 ? "product" : "products"
              }`}
            />
          </View>

          <AppButton
            title="Add Product"
            icon="add"
            onPress={() => router.push("/add-product")}
            fullWidth={!isTablet}
          />
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingState message="Loading products..." />
      </View>
    );
  }

  if (error && products.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.errorScreen}>
          <ErrorState title="Unable to load products" message={error} />

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
          <View style={styles.emptyContainer}>
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

      {error && products.length > 0 ? (
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

  productCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 76,
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
