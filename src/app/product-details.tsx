import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import type { InventoryItemWithProduct } from "@/models/inventory";
import type { Product } from "@/models/product";
import { getOrCreateInventoryForProduct } from "@/repositories/inventoryRepository";
import {
  getProductById,
  setProductActive,
} from "@/repositories/productRepository";

export default function ProductDetailsScreen() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const isTablet = width >= 768;

  const [product, setProduct] = useState<Product | null>(null);
  const [inventory, setInventory] = useState<InventoryItemWithProduct | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBackToProducts = useCallback(() => {
    router.replace("/products");
  }, []);

  const loadProduct = useCallback(async () => {
    if (!id) {
      setError("Product ID is missing.");
      setLoading(false);
      return;
    }

    const productId = Number(id);

    if (!Number.isInteger(productId) || productId <= 0) {
      setError("Invalid product ID.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await getProductById(productId);

      if (!result) {
        setError("Product not found.");
        setProduct(null);
        setInventory(null);
        return;
      }

      setProduct(result);

      const inventoryResult = await getOrCreateInventoryForProduct(result.id);

      const inventoryWithProduct: InventoryItemWithProduct = {
        ...inventoryResult,
        productName: result.name,
        productDescription: result.description,
        productPrice: result.price,
        productIsActive: result.isActive,
      };

      setInventory(inventoryWithProduct);
    } catch (error) {
      console.error("Failed to load product:", error);

      setError(
        error instanceof Error ? error.message : "Unable to load product.",
      );
      setInventory(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadProduct();
    }, [loadProduct]),
  );

  const handleToggleStatus = useCallback(async () => {
    if (!product) {
      return;
    }

    const nextStatus = !product.isActive;

    Alert.alert(
      nextStatus ? "Activate Product" : "Deactivate Product",
      nextStatus
        ? `Are you sure you want to activate "${product.name}"?`
        : `Are you sure you want to deactivate "${product.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: nextStatus ? "Activate" : "Deactivate",
          style: nextStatus ? "default" : "destructive",
          onPress: async () => {
            try {
              setUpdatingStatus(true);
              setError(null);

              const updatedProduct = await setProductActive(
                product.id,
                nextStatus,
              );

              setProduct(updatedProduct);
            } catch (error) {
              console.error("Failed to update product status:", error);

              setError(
                error instanceof Error
                  ? error.message
                  : "Unable to update product status.",
              );
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
      ],
    );
  }, [product]);

  const formatQuantity = (quantity: number) => {
    if (Number.isInteger(quantity)) {
      return quantity.toString();
    }

    return quantity.toFixed(2).replace(/\.?0+$/, "");
  };

  const getInventoryStatus = () => {
    if (!inventory || !inventory.isTrackingEnabled) {
      return {
        label: "Not Tracked",
        variant: "neutral" as const,
      };
    }

    if (inventory.currentQuantity <= 0) {
      return {
        label: "Out of Stock",
        variant: "danger" as const,
      };
    }

    if (
      inventory.lowStockLevel > 0 &&
      inventory.currentQuantity <= inventory.lowStockLevel
    ) {
      return {
        label: "Low Stock",
        variant: "warning" as const,
      };
    }

    return {
      label: "In Stock",
      variant: "success" as const,
    };
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="cube-outline"
          title="Product Details"
          subtitle="Loading product"
        />

        <LoadingState message="Loading product..." />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="cube-outline"
          title="Product Details"
          subtitle="Product unavailable"
        />

        <View style={styles.errorScreen}>
          <ErrorState
            title="Unable to load product"
            message={error || "Product not found."}
          />

          <AppButton
            title="Back to Products"
            icon="arrow-back"
            onPress={handleBackToProducts}
          />
        </View>
      </View>
    );
  }

  const inventoryStatus = getInventoryStatus();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          isTablet && styles.contentTablet,
        ]}
      >
        <PageHero
          icon="cube-outline"
          title="Product Details"
          subtitle={product.name}
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={18} color={colors.danger} />

            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <AppCard style={styles.profileCard}>
          <View style={styles.productIcon}>
            <Ionicons name="cube-outline" size={34} color={colors.primary} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.productName}>{product.name}</Text>

            <StatusBadge
              label={product.isActive ? "Active" : "Inactive"}
              variant={product.isActive ? "success" : "neutral"}
            />
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={colors.primary}
              />
            </View>

            <Text style={styles.sectionTitle}> Product Information</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Selling Price</Text>

            <Text style={styles.infoValue}>₱{product.price.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRowVertical}>
            <Text style={styles.infoLabel}>Description</Text>

            <Text style={styles.descriptionValue}>
              {product.description || "No description provided."}
            </Text>
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIcon}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
            </View>

            <View style={styles.sectionTitleContent}>
              <Text style={styles.sectionTitle}>Inventory</Text>

              <Text style={styles.sectionSubtitle}>
                Stock information for this product
              </Text>
            </View>
          </View>

          <View style={styles.inventoryStatusRow}>
            <View>
              <Text style={styles.inventoryLabel}>Stock Status</Text>

              <View style={styles.statusBadgeWrapper}>
                <StatusBadge
                  label={inventoryStatus.label}
                  variant={inventoryStatus.variant}
                />
              </View>
            </View>

            <View style={styles.stockValueContainer}>
              <Text style={styles.stockValue}>
                {inventory ? formatQuantity(inventory.currentQuantity) : "0"}
              </Text>

              <Text style={styles.stockUnit}>{inventory?.unit || "piece"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.inventoryGrid}>
            <View style={styles.inventoryInfoItem}>
              <Text style={styles.infoLabel}>Cost per Unit</Text>

              <Text style={styles.inventoryInfoValue}>
                ₱{(inventory?.costPerUnit || 0).toFixed(2)}
              </Text>
            </View>

            <View style={styles.inventoryInfoItem}>
              <Text style={styles.infoLabel}>Low Stock Level</Text>

              <Text style={styles.inventoryInfoValue}>
                {inventory ? formatQuantity(inventory.lowStockLevel) : "0"}
              </Text>
            </View>
          </View>

          {!inventory?.isTrackingEnabled ? (
            <View style={styles.trackingNotice}>
              <Ionicons
                name="information-circle-outline"
                size={17}
                color={colors.textMuted}
              />

              <Text style={styles.trackingNoticeText}>
                Inventory tracking is currently disabled for this product.
              </Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.historyLink,
              pressed && styles.historyLinkPressed,
            ]}
            onPress={() =>
              router.replace({
                pathname: "/inventory-history",
                params: {
                  id: product.id.toString(),
                },
              })
            }
          >
            <Ionicons name="time-outline" size={16} color={colors.primary} />

            <Text style={styles.historyLinkText}>View Inventory History</Text>

            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.historyLink,
              pressed && styles.historyLinkPressed,
            ]}
            onPress={() =>
              router.replace({
                pathname: "/inventory-settings",
                params: {
                  id: product.id.toString(),
                },
              })
            }
          >
            <Ionicons
              name="settings-outline"
              size={16}
              color={colors.primary}
            />

            <Text style={styles.historyLinkText}>Inventory Settings</Text>

            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </Pressable>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.actions}>
            <AppButton
              title="Edit Product"
              icon="create-outline"
              onPress={() =>
                router.replace({
                  pathname: "/edit-product",
                  params: {
                    id: product.id.toString(),
                  },
                })
              }
              fullWidth
            />

            <AppButton
              title="Add Stock"
              icon="arrow-down-circle-outline"
              onPress={() =>
                router.replace({
                  pathname: "/stock-in",
                  params: {
                    id: product.id.toString(),
                  },
                })
              }
              fullWidth
            />

            <AppButton
              title="Remove Stock"
              icon="arrow-up-circle-outline"
              onPress={() =>
                router.replace({
                  pathname: "/stock-out",
                  params: {
                    id: product.id.toString(),
                  },
                })
              }
              fullWidth
            />

            <AppButton
              title="Adjust Stock"
              icon="options-outline"
              onPress={() =>
                router.replace({
                  pathname: "/stock-adjustment",
                  params: {
                    id: product.id.toString(),
                  },
                })
              }
              fullWidth
            />

            <AppButton
              title={
                product.isActive ? "Deactivate Product" : "Activate Product"
              }
              icon={
                product.isActive
                  ? "pause-circle-outline"
                  : "play-circle-outline"
              }
              variant={product.isActive ? "secondary" : "primary"}
              onPress={handleToggleStatus}
              loading={updatingStatus}
              fullWidth
            />

            <AppButton
              title="Back to Products"
              icon="arrow-back"
              variant="ghost"
              onPress={handleBackToProducts}
              fullWidth
            />
          </View>
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingBottom: spacing["4xl"],
  },

  contentTablet: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },

  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING,
    gap: spacing.lg,
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: PAGE_PADDING,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: colors.dangerLight,
  },

  errorBannerText: {
    flex: 1,
    ...typography.caption,
    color: colors.danger,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: PAGE_PADDING,
    marginTop: spacing.xl,
  },

  productIcon: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
  },

  profileInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.lg,
  },

  productName: {
    marginBottom: spacing.sm,
    ...typography.h3,
    color: colors.text,
  },

  card: {
    marginHorizontal: PAGE_PADDING,
    marginTop: spacing.lg,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },

  sectionIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  sectionTitleContent: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.md,
  },

  sectionTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  sectionSubtitle: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.textMuted,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  infoRowVertical: {
    gap: spacing.sm,
  },

  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },

  infoValue: {
    ...typography.bodyMedium,
    color: colors.text,
    textAlign: "right",
  },

  descriptionValue: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },

  divider: {
    height: 1,
    marginVertical: spacing.lg,
    backgroundColor: colors.border,
  },

  inventoryStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
  },

  inventoryLabel: {
    marginBottom: spacing.sm,
    ...typography.caption,
    color: colors.textMuted,
  },

  statusBadgeWrapper: {
    alignSelf: "flex-start",
  },

  stockValueContainer: {
    alignItems: "flex-end",
  },

  stockValue: {
    ...typography.h2,
    color: colors.text,
  },

  stockUnit: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.textMuted,
  },

  inventoryGrid: {
    flexDirection: "row",
    gap: spacing.lg,
  },

  inventoryInfoItem: {
    flex: 1,
  },

  inventoryInfoValue: {
    marginTop: spacing.xs,
    ...typography.bodyMedium,
    color: colors.text,
  },

  trackingNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.background,
  },

  trackingNoticeText: {
    flex: 1,
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 19,
  },

  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
  },

  historyLinkPressed: {
    opacity: 0.6,
  },

  historyLinkText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },

  actions: {
    gap: spacing.md,
  },
});
