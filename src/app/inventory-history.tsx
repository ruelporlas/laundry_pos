import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import type {
  InventoryItem,
  InventoryMovement,
  InventoryMovementType,
} from "@/models/inventory";
import {
  getInventoryByProductId,
  getInventoryMovements,
} from "@/repositories/inventoryRepository";
import { getProductById } from "@/repositories/productRepository";

type MovementMeta = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant: "success" | "danger" | "warning" | "neutral";
};

function getMovementMeta(movementType: InventoryMovementType): MovementMeta {
  switch (movementType) {
    case "stock_received":
      return {
        label: "Stock Received",
        icon: "arrow-down-circle-outline",
        variant: "success",
      };

    case "sale":
      return {
        label: "Sale",
        icon: "cart-outline",
        variant: "danger",
      };

    case "return":
      return {
        label: "Return",
        icon: "return-down-back-outline",
        variant: "success",
      };

    case "adjustment":
      return {
        label: "Adjustment",
        icon: "swap-horizontal-outline",
        variant: "warning",
      };

    case "stock_removed":
      return {
        label: "Stock Removed",
        icon: "arrow-up-circle-outline",
        variant: "danger",
      };

    default:
      return {
        label: "Inventory Movement",
        icon: "swap-horizontal-outline",
        variant: "neutral",
      };
  }
}

function formatQuantity(quantity: number): string {
  if (Number.isInteger(quantity)) {
    return Math.abs(quantity).toString();
  }

  return Math.abs(quantity)
    .toFixed(2)
    .replace(/\.?0+$/, "");
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getQuantityPrefix(quantity: number): string {
  if (quantity > 0) {
    return "+";
  }

  if (quantity < 0) {
    return "−";
  }

  return "";
}

function getMovementDetails(item: InventoryMovement): string {
  const details: string[] = [];

  if (item.supplier) {
    details.push(item.supplier);
  }

  if (item.unitCost > 0) {
    details.push(`₱${item.unitCost.toFixed(2)}/unit`);
  }

  if (item.reason) {
    details.push(item.reason);
  }

  if (item.notes) {
    details.push(item.notes);
  }

  return details.join(" · ");
}

export default function InventoryHistoryScreen() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const isTablet = width >= 768;

  const [productName, setProductName] = useState("");
  const [inventory, setInventory] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productId = Number(id);

  const loadHistory = useCallback(async () => {
    if (!id) {
      setError("Product ID is missing.");
      setLoading(false);
      return;
    }

    if (!Number.isInteger(productId) || productId <= 0) {
      setError("Invalid product ID.");
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const [product, inventoryResult, movementResults] = await Promise.all([
        getProductById(productId),
        getInventoryByProductId(productId),
        getInventoryMovements(productId),
      ]);

      if (!product) {
        setError("Product not found.");
        setProductName("");
        setInventory(null);
        setMovements([]);
        return;
      }

      setProductName(product.name);
      setInventory(inventoryResult);
      setMovements(movementResults);
    } catch (error) {
      console.error("Failed to load inventory history:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load inventory history.",
      );
    } finally {
      setLoading(false);
    }
  }, [id, productId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadHistory();
    } finally {
      setRefreshing(false);
    }
  }, [loadHistory]);

  const handleBack = useCallback(() => {
    router.replace({
      pathname: "/product-details",
      params: {
        id: productId.toString(),
      },
    });
  }, [productId]);

  const renderMobileMovement = useCallback(
    ({ item }: { item: InventoryMovement }) => {
      const meta = getMovementMeta(item.movementType);
      const isPositive = item.quantity > 0;
      const isNegative = item.quantity < 0;

      return (
        <AppCard style={styles.movementCard}>
          <View style={styles.movementHeader}>
            <View style={styles.movementTitleRow}>
              <View style={styles.movementIcon}>
                <Ionicons name={meta.icon} size={20} color={colors.primary} />
              </View>

              <View style={styles.movementTitleContent}>
                <Text style={styles.movementTitle}>{meta.label}</Text>

                <Text style={styles.movementDate}>
                  {formatDateTime(item.createdAt)}
                </Text>
              </View>
            </View>

            <StatusBadge label={meta.label} variant={meta.variant} />
          </View>

          <View style={styles.divider} />

          <View style={styles.quantityBalanceRow}>
            <View style={styles.quantityColumn}>
              <Text style={styles.detailLabel}>Quantity</Text>

              <Text
                style={[
                  styles.quantityValue,
                  isPositive && styles.quantityPositive,
                  isNegative && styles.quantityNegative,
                ]}
              >
                {getQuantityPrefix(item.quantity)}
                {formatQuantity(item.quantity)}
              </Text>

              <Text style={styles.quantityUnit}>
                {inventory?.unit || "piece"}
              </Text>
            </View>

            <View style={styles.balanceColumn}>
              <Text style={styles.detailLabel}>Balance After</Text>

              <Text style={styles.balanceValue}>
                {formatQuantity(item.balanceAfter)}
              </Text>

              <Text style={styles.quantityUnit}>
                {inventory?.unit || "piece"}
              </Text>
            </View>
          </View>

          {item.unitCost > 0 ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Unit Cost</Text>

              <Text style={styles.detailValue}>
                ₱{item.unitCost.toFixed(2)}
              </Text>
            </View>
          ) : null}

          {item.supplier ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Supplier</Text>

              <Text style={styles.detailValue}>{item.supplier}</Text>
            </View>
          ) : null}

          {item.reference ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference</Text>

              <Text style={styles.detailValue}>{item.reference}</Text>
            </View>
          ) : null}

          {item.reason ? (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Reason</Text>

              <Text style={styles.detailText}>{item.reason}</Text>
            </View>
          ) : null}

          {item.notes ? (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Notes</Text>

              <Text style={styles.detailText}>{item.notes}</Text>
            </View>
          ) : null}

          {item.jobOrderId !== null ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Job Order</Text>

              <Text style={styles.detailValue}>
                item.jobOrderNumber || item.reference
              </Text>
            </View>
          ) : null}

          {item.createdBy !== null ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Recorded By</Text>

              <Text style={styles.detailValue}>
                {item.createdByName || "Unknown user"}
              </Text>
            </View>
          ) : null}
        </AppCard>
      );
    },
    [inventory?.unit],
  );

  const renderTabletMovement = useCallback(
    ({ item }: { item: InventoryMovement }) => {
      const meta = getMovementMeta(item.movementType);
      const isPositive = item.quantity > 0;
      const isNegative = item.quantity < 0;
      const details = getMovementDetails(item);

      return (
        <View style={styles.tableRow}>
          <View style={[styles.tableCell, styles.dateCell]}>
            <Text style={styles.tablePrimaryText}>
              {formatDateTime(item.createdAt)}
            </Text>
          </View>

          <View style={[styles.tableCell, styles.movementCell]}>
            <View style={styles.tableMovementContent}>
              <View style={styles.tableMovementIcon}>
                <Ionicons name={meta.icon} size={17} color={colors.primary} />
              </View>

              <View style={styles.tableMovementText}>
                <Text style={styles.tablePrimaryText}>{meta.label}</Text>

                {details ? (
                  <Text style={styles.tableSecondaryText} numberOfLines={2}>
                    {details}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View style={[styles.tableCell, styles.quantityCell]}>
            <Text
              style={[
                styles.tableQuantity,
                isPositive && styles.tableQuantityPositive,
                isNegative && styles.tableQuantityNegative,
              ]}
            >
              {getQuantityPrefix(item.quantity)}
              {formatQuantity(item.quantity)}
            </Text>

            <Text style={styles.tableUnit}>{inventory?.unit || "piece"}</Text>
          </View>

          <View style={[styles.tableCell, styles.balanceCell]}>
            <Text style={styles.tablePrimaryText}>
              {formatQuantity(item.balanceAfter)}
            </Text>

            <Text style={styles.tableUnit}>{inventory?.unit || "piece"}</Text>
          </View>

          <View style={[styles.tableCell, styles.referenceCell]}>
            {item.jobOrderId !== null ? (
              <Text style={styles.tablePrimaryText}>
                item.jobOrderNumber || item.reference
              </Text>
            ) : item.reference ? (
              <Text style={styles.tablePrimaryText} numberOfLines={2}>
                {item.reference}
              </Text>
            ) : (
              <Text style={styles.tableMutedText}>—</Text>
            )}
          </View>

          <View style={[styles.tableCell, styles.userCell]}>
            {item.createdBy !== null ? (
              <Text style={styles.tableSecondaryText} numberOfLines={2}>
                {item.createdByName || "Unknown user"}
              </Text>
            ) : (
              <Text style={styles.tableMutedText}>—</Text>
            )}
          </View>
        </View>
      );
    },
    [inventory?.unit],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="time-outline"
          title="Inventory History"
          subtitle="Loading history"
        />

        <LoadingState message="Loading inventory history..." />
      </View>
    );
  }

  if (error && !productName) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="time-outline"
          title="Inventory History"
          subtitle="History unavailable"
        />

        <View style={styles.errorScreen}>
          <ErrorState title="Unable to load history" message={error} />

          <Pressable
            style={({ pressed }) => [
              styles.backLink,
              pressed && styles.backLinkPressed,
            ]}
            onPress={() => router.replace("/products")}
          >
            <Ionicons name="arrow-back" size={16} color={colors.primary} />

            <Text style={styles.backLinkText}>Back to Products</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[styles.screenContent, isTablet && styles.screenContentTablet]}
      >
        <PageHero
          icon="time-outline"
          title="Inventory History"
          subtitle={productName}
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={18} color={colors.danger} />

            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.summaryWrapper}>
          <AppCard style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="cube-outline" size={22} color={colors.primary} />
            </View>

            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Current Stock</Text>

              <View style={styles.summaryValueRow}>
                <Text style={styles.summaryValue}>
                  {inventory ? formatQuantity(inventory.currentQuantity) : "0"}
                </Text>

                <Text style={styles.summaryUnit}>
                  {inventory?.unit || "piece"}
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.summaryBackLink,
                pressed && styles.backLinkPressed,
              ]}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={16} color={colors.primary} />

              <Text style={styles.summaryBackText}>Product</Text>
            </Pressable>
          </AppCard>
        </View>

        {movements.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <EmptyState
              title="No inventory history yet"
              message="Stock movements for this product will appear here."
              icon="time-outline"
            />
          </View>
        ) : isTablet ? (
          <View style={styles.tableSection}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Movement History</Text>

              <Text style={styles.listSubtitle}>
                {movements.length}{" "}
                {movements.length === 1 ? "movement" : "movements"}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tableScrollContent}
            >
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <View style={[styles.tableHeaderCell, styles.dateCell]}>
                    <Text style={styles.tableHeaderText}>Date & Time</Text>
                  </View>

                  <View style={[styles.tableHeaderCell, styles.movementCell]}>
                    <Text style={styles.tableHeaderText}>Movement</Text>
                  </View>

                  <View style={[styles.tableHeaderCell, styles.quantityCell]}>
                    <Text style={styles.tableHeaderText}>Qty</Text>
                  </View>

                  <View style={[styles.tableHeaderCell, styles.balanceCell]}>
                    <Text style={styles.tableHeaderText}>Balance</Text>
                  </View>

                  <View style={[styles.tableHeaderCell, styles.referenceCell]}>
                    <Text style={styles.tableHeaderText}>Reference</Text>
                  </View>

                  <View style={[styles.tableHeaderCell, styles.userCell]}>
                    <Text style={styles.tableHeaderText}>User</Text>
                  </View>
                </View>

                <FlatList
                  data={movements}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderTabletMovement}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                    />
                  }
                  ListFooterComponent={
                    <View style={styles.tableFooter}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.footerBackLink,
                          pressed && styles.backLinkPressed,
                        ]}
                        onPress={handleBack}
                      >
                        <Ionicons
                          name="arrow-back"
                          size={16}
                          color={colors.primary}
                        />

                        <Text style={styles.footerBackText}>
                          Back to Product Details
                        </Text>
                      </Pressable>
                    </View>
                  }
                />
              </View>
            </ScrollView>
          </View>
        ) : (
          <FlatList
            data={movements}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMobileMovement}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Movement History</Text>

                <Text style={styles.listSubtitle}>
                  {movements.length}{" "}
                  {movements.length === 1 ? "movement" : "movements"}
                </Text>
              </View>
            }
            ListFooterComponent={
              <View style={styles.footer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.footerBackLink,
                    pressed && styles.backLinkPressed,
                  ]}
                  onPress={handleBack}
                >
                  <Ionicons
                    name="arrow-back"
                    size={16}
                    color={colors.primary}
                  />

                  <Text style={styles.footerBackText}>
                    Back to Product Details
                  </Text>
                </Pressable>
              </View>
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

  screenContent: {
    flex: 1,
  },

  screenContentTablet: {
    width: "100%",
    maxWidth: 1400,
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

  summaryWrapper: {
    marginHorizontal: PAGE_PADDING,
    marginTop: spacing.xl,
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  summaryIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  summaryContent: {
    flex: 1,
    minWidth: 0,
  },

  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },

  summaryValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },

  summaryValue: {
    ...typography.h3,
    color: colors.text,
  },

  summaryUnit: {
    ...typography.caption,
    color: colors.textMuted,
  },

  summaryBackLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },

  summaryBackText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },

  listContent: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.xl,
    paddingBottom: spacing["4xl"],
  },

  listHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  listTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  listSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },

  movementCard: {
    marginBottom: spacing.md,
  },

  movementHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  movementTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  movementIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  movementTitleContent: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.md,
  },

  movementTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  movementDate: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.textMuted,
  },

  divider: {
    height: 1,
    marginVertical: spacing.lg,
    backgroundColor: colors.border,
  },

  quantityBalanceRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing.md,
  },

  quantityColumn: {
    flex: 1,
  },

  balanceColumn: {
    flex: 1,
  },

  detailLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },

  quantityValue: {
    marginTop: spacing.xs,
    ...typography.h3,
    color: colors.text,
  },

  quantityPositive: {
    color: colors.success,
  },

  quantityNegative: {
    color: colors.danger,
  },

  quantityUnit: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
  },

  balanceValue: {
    marginTop: spacing.xs,
    ...typography.h3,
    color: colors.text,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.lg,
    paddingVertical: spacing.xs,
  },

  detailValue: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    textAlign: "right",
  },

  detailBlock: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },

  detailText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 21,
  },

  /*
   * Tablet / Web inventory ledger
   */

  tableSection: {
    flex: 1,
    marginHorizontal: PAGE_PADDING,
    marginTop: spacing.xl,
  },

  tableScrollContent: {
    paddingBottom: spacing["4xl"],
  },

  table: {
    width: 1120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },

  tableHeader: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 48,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  tableHeaderCell: {
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  tableHeaderText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
  },

  tableRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 68,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  tableCell: {
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },

  dateCell: {
    width: 180,
  },

  movementCell: {
    width: 290,
  },

  quantityCell: {
    width: 105,
    alignItems: "flex-start",
  },

  balanceCell: {
    width: 110,
    alignItems: "flex-start",
  },

  referenceCell: {
    width: 200,
  },

  userCell: {
    width: 135,
    borderRightWidth: 0,
  },

  tableMovementContent: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  tableMovementIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    backgroundColor: colors.primaryLight,
    marginRight: spacing.sm,
  },

  tableMovementText: {
    flex: 1,
    minWidth: 0,
  },

  tablePrimaryText: {
    ...typography.body,
    color: colors.text,
  },

  tableSecondaryText: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
  },

  tableMutedText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  tableQuantity: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  tableQuantityPositive: {
    color: colors.success,
  },

  tableQuantityNegative: {
    color: colors.danger,
  },

  tableUnit: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
  },

  tableFooter: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },

  emptyWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: spacing["4xl"],
  },

  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },

  backLinkPressed: {
    opacity: 0.6,
  },

  backLinkText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },

  footer: {
    alignItems: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  footerBackLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },

  footerBackText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
});
