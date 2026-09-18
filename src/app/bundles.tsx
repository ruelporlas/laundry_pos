import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { Bundle } from "@/models/bundle";
import { getBundles } from "@/repositories/bundleRepository";

const PAGE_PADDING = 16;
const GRID_GAP = 16;
const MAX_CONTENT_WIDTH = 1200;

export default function BundlesScreen() {
  const { width } = useWindowDimensions();

  const numColumns = width >= 1200 ? 4 : width >= 768 ? 3 : 2;

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);

  const availableWidth = contentWidth - PAGE_PADDING * 2;

  const cardWidth = (availableWidth - GRID_GAP * (numColumns - 1)) / numColumns;

  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadBundles = useCallback(async () => {
    try {
      setError("");

      const result = await getBundles();

      setBundles(result);
    } catch (error) {
      console.error("Failed to load bundles:", error);

      setError(
        error instanceof Error ? error.message : "Unable to load bundles.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBundles();
  }, [loadBundles]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadBundles();
  }, [loadBundles]);

  const filteredBundles = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return bundles;
    }

    return bundles.filter((bundle) => {
      return (
        bundle.name.toLowerCase().includes(searchValue) ||
        bundle.description.toLowerCase().includes(searchValue)
      );
    });
  }, [bundles, search]);

  const renderBundle = useCallback(
    ({ item }: { item: Bundle }) => {
      return (
        <AppCard
          onPress={() =>
            router.push({
              pathname: "/bundle-details",
              params: {
                id: item.id.toString(),
              },
            })
          }
          style={[
            styles.bundleCard,
            {
              width: cardWidth,
            },
          ]}
        >
          <View style={styles.cardTop}>
            <View style={styles.bundleIcon}>
              <Ionicons name="gift-outline" size={24} color={colors.primary} />
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color={colors.textMuted}
            />
          </View>

          <View style={styles.bundleInfo}>
            <Text style={styles.bundleName} numberOfLines={1}>
              {item.name}
            </Text>

            <StatusBadge
              label={item.isActive ? "Active" : "Inactive"}
              variant={item.isActive ? "success" : "neutral"}
            />
          </View>

          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.cardBottom}>
            <View style={styles.itemInfo}>
              <Ionicons
                name="layers-outline"
                size={15}
                color={colors.textMuted}
              />

              <Text style={styles.itemCount}>
                {item.items.length} {item.items.length === 1 ? "item" : "items"}
              </Text>
            </View>

            <Text style={styles.price}>₱{item.price.toFixed(2)}</Text>
          </View>
        </AppCard>
      );
    },
    [cardWidth],
  );

  return (
    <View style={styles.container}>
      <FlatList
        key={`bundle-grid-${numColumns}`}
        data={filteredBundles}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBundle}
        numColumns={numColumns}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons
                  name="gift-outline"
                  size={30}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.heroTitle}>Bundles</Text>

              <Text style={styles.heroSubtitle}>
                Combine products and services into one convenient package
              </Text>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={20}
                color={colors.textMuted}
              />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search bundles..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                returnKeyType="search"
              />

              {search ? (
                <Pressable
                  onPress={() => setSearch("")}
                  hitSlop={8}
                  style={styles.clearButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.actionRow}>
              <View style={styles.listLabel}>
                <Text style={styles.listTitle}>Bundle List</Text>

                <Text style={styles.listCount}>
                  {filteredBundles.length}{" "}
                  {filteredBundles.length === 1 ? "bundle" : "bundles"}
                </Text>
              </View>

              <AppButton
                title="Add Bundle"
                icon="add"
                onPress={() => router.push("/add-bundle")}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={colors.primary} />

              <Text style={styles.loadingText}>Loading bundles...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContent}>
              <View style={styles.errorIcon}>
                <Ionicons
                  name="warning-outline"
                  size={30}
                  color={colors.danger}
                />
              </View>

              <Text style={styles.errorTitle}>Unable to Load Bundles</Text>

              <Text style={styles.errorMessage}>{error}</Text>

              <AppButton
                title="Try Again"
                icon="refresh"
                onPress={loadBundles}
              />
            </View>
          ) : (
            <EmptyState
              icon="gift-outline"
              title={search.trim() ? "No Bundles Found" : "No Bundles Yet"}
              message={
                search.trim()
                  ? "Try a different search term."
                  : "Create your first bundle to get started."
              }
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  listContent: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: spacing["5xl"],
  },

  headerContent: {
    width: "100%",
    paddingBottom: spacing.lg,
  },

  hero: {
    alignItems: "center",
    paddingTop: 54,
    paddingBottom: 20,
    marginHorizontal: -PAGE_PADDING,
    paddingHorizontal: spacing["2xl"],
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

  heroTitle: {
    marginTop: spacing.md,
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },

  heroSubtitle: {
    maxWidth: 420,
    marginTop: spacing.xs,
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
  },

  searchInput: {
    flex: 1,
    minHeight: 46,
    marginLeft: spacing.sm,
    paddingVertical: 0,
    ...typography.body,
    color: colors.text,
  },

  clearButton: {
    padding: spacing.xs,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },

  listLabel: {
    flex: 1,
  },

  listTitle: {
    ...typography.h3,
    color: colors.text,
  },

  listCount: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
  },

  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: GRID_GAP,
  },

  bundleCard: {
    minHeight: 190,
    padding: spacing.lg,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  bundleIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  bundleInfo: {
    marginTop: spacing.md,
  },

  bundleName: {
    marginBottom: spacing.xs,
    ...typography.h3,
    color: colors.text,
  },

  description: {
    flex: 1,
    marginTop: spacing.md,
    ...typography.small,
    color: colors.textSecondary,
  },

  cardBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  itemInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  itemCount: {
    ...typography.caption,
    color: colors.textMuted,
  },

  price: {
    ...typography.h3,
    color: colors.primary,
  },

  centerContent: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  },

  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.textMuted,
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
    maxWidth: 360,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
});
