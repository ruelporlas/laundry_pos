import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
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
  InventoryItemWithProduct,
  InventoryMovement,
} from "@/models/inventory";
import {
  getAllInventory,
  getInventoryDashboardCounts,
  getLowStockInventory,
  getOutOfStockInventory,
  getRecentInventoryMovements,
} from "@/repositories/inventoryRepository";

const MAX_CONTENT_WIDTH = 1200;
const PAGE_PADDING = 16;
const GRID_GAP = 16;
const RECENT_ACTIVITY_LIMIT = 8;

type DashboardCounts = {
  trackedProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  inventoryValue: number;
};

const EMPTY_COUNTS: DashboardCounts = {
  trackedProducts: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
  inventoryValue: 0,
};

function formatQuantity(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value: string): string {
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

function getMovementLabel(type: InventoryMovement["movementType"]): string {
  switch (type) {
    case "stock_received":
      return "Stock Received";

    case "sale":
      return "Sale";

    case "return":
      return "Return";

    case "adjustment":
      return "Adjustment";

    case "stock_removed":
      return "Stock Removed";

    default:
      return "Inventory Activity";
  }
}

function getMovementIcon(
  type: InventoryMovement["movementType"],
): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "stock_received":
      return "arrow-down-circle-outline";

    case "sale":
      return "cart-outline";

    case "return":
      return "return-down-back-outline";

    case "adjustment":
      return "construct-outline";

    case "stock_removed":
      return "remove-circle-outline";

    default:
      return "swap-vertical-outline";
  }
}

function getMovementIconBackground(
  type: InventoryMovement["movementType"],
): string {
  switch (type) {
    case "stock_received":
      return colors.primaryLight;

    case "sale":
      return colors.background;

    case "return":
      return colors.primaryLight;

    case "adjustment":
      return colors.background;

    case "stock_removed":
      return colors.background;

    default:
      return colors.background;
  }
}

function getMovementQuantityText(movement: InventoryMovement): string {
  const quantity = movement.quantity;

  if (quantity > 0) {
    return `+${formatQuantity(quantity)}`;
  }

  return formatQuantity(quantity);
}

function getMovementQuantityStyle(
  movement: InventoryMovement,
): "positive" | "negative" | "neutral" {
  if (movement.quantity > 0) {
    return "positive";
  }

  if (movement.quantity < 0) {
    return "negative";
  }

  return "neutral";
}

function getStockStatus(item: InventoryItemWithProduct): {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
} {
  if (item.currentQuantity <= 0) {
    return {
      label: "Out of stock",
      icon: "alert-circle-outline",
    };
  }

  return {
    label: "Low stock",
    icon: "warning-outline",
  };
}

export default function InventoryDashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const availableWidth = contentWidth - PAGE_PADDING * 2;

  const [counts, setCounts] = useState<DashboardCounts>(EMPTY_COUNTS);
  const [lowStockProducts, setLowStockProducts] = useState<
    InventoryItemWithProduct[]
  >([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<
    InventoryItemWithProduct[]
  >([]);
  const [recentMovements, setRecentMovements] = useState<InventoryMovement[]>(
    [],
  );
  const [inventoryItems, setInventoryItems] = useState<
    InventoryItemWithProduct[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const inventoryById = useMemo(() => {
    const map = new Map<number, InventoryItemWithProduct>();

    for (const item of inventoryItems) {
      map.set(item.id, item);
    }

    return map;
  }, [inventoryItems]);

  const loadDashboard = useCallback(async () => {
    try {
      setError("");

      const [dashboardCounts, lowStock, outOfStock, movements, allInventory] =
        await Promise.all([
          getInventoryDashboardCounts(),
          getLowStockInventory(),
          getOutOfStockInventory(),
          getRecentInventoryMovements(RECENT_ACTIVITY_LIMIT),
          getAllInventory(),
        ]);

      setCounts(dashboardCounts);
      setLowStockProducts(lowStock);
      setOutOfStockProducts(outOfStock);
      setRecentMovements(movements);
      setInventoryItems(allInventory);
    } catch (loadError) {
      console.error("Failed to load inventory dashboard:", loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load inventory dashboard.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadDashboard();
  }, [loadDashboard]);

  const lowStockDisplay = useMemo(() => {
    return lowStockProducts.filter((item) => item.currentQuantity > 0);
  }, [lowStockProducts]);

  const showLowStockSection =
    lowStockDisplay.length > 0 || outOfStockProducts.length > 0;

  const summaryCardWidth = isTablet
    ? (availableWidth - GRID_GAP * 3) / 4
    : (availableWidth - GRID_GAP) / 2;

  const handleOpenProduct = (productId: number) => {
    router.push(`/product-details?id=${productId}`);
  };

  const handleOpenHistory = (productId: number) => {
    router.push(`/inventory-history?id=${productId}`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        {
          maxWidth: MAX_CONTENT_WIDTH,
          width: "100%",
          alignSelf: "center",
          paddingHorizontal: PAGE_PADDING,
        },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="cube-outline" size={30} color={colors.primary} />
        </View>

        <Text style={styles.heroTitle}>Inventory</Text>

        <Text style={styles.heroSubtitle}>
          Monitor your stock and inventory activity
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />

          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={24}
              color={colors.primary}
            />
          </View>

          <View style={styles.errorContent}>
            <Text style={styles.errorTitle}>Unable to load inventory</Text>

            <Text style={styles.errorText}>{error}</Text>

            <Pressable
              onPress={() => {
                setLoading(true);
                void loadDashboard();
              }}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {/* Summary */}
          <View style={styles.summaryGrid}>
            <SummaryCard
              width={summaryCardWidth}
              icon="cube-outline"
              label="Tracked Products"
              value={counts.trackedProducts.toString()}
              description="Products using inventory"
            />

            <SummaryCard
              width={summaryCardWidth}
              icon="warning-outline"
              label="Low Stock"
              value={counts.lowStockProducts.toString()}
              description="At or below threshold"
              onPress={
                counts.lowStockProducts > 0
                  ? () => {
                      // The alert section below is the intended destination.
                    }
                  : undefined
              }
            />

            <SummaryCard
              width={summaryCardWidth}
              icon="alert-circle-outline"
              label="Out of Stock"
              value={counts.outOfStockProducts.toString()}
              description="Currently at zero"
            />

            <SummaryCard
              width={summaryCardWidth}
              icon="cash-outline"
              label="Inventory Value"
              value={formatCurrency(counts.inventoryValue)}
              description="Based on current cost"
              helpText="This is the estimated value of tracked stock using each product's current weighted-average cost."
            />
          </View>

          {/* Stock Alerts */}
          {showLowStockSection ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionTitle}>Stock Alerts</Text>

                  <Text style={styles.sectionSubtitle}>
                    Products that may need attention
                  </Text>
                </View>

                <View style={styles.sectionCount}>
                  <Text style={styles.sectionCountText}>
                    {lowStockProducts.length}
                  </Text>
                </View>
              </View>

              <View style={styles.alertCard}>
                {outOfStockProducts.map((item, index) => (
                  <StockAlertRow
                    key={`out-${item.id}`}
                    item={item}
                    isLast={
                      index === outOfStockProducts.length - 1 &&
                      lowStockDisplay.length === 0
                    }
                    onPress={() => handleOpenProduct(item.productId)}
                  />
                ))}

                {lowStockDisplay.map((item, index) => (
                  <StockAlertRow
                    key={`low-${item.id}`}
                    item={item}
                    isLast={index === lowStockDisplay.length - 1}
                    onPress={() => handleOpenProduct(item.productId)}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionTitle}>Stock Alerts</Text>

                  <Text style={styles.sectionSubtitle}>
                    Products that may need attention
                  </Text>
                </View>
              </View>

              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={28}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.emptyTitle}>Stock looks good</Text>

                <Text style={styles.emptyText}>
                  No tracked products are currently low or out of stock.
                </Text>
              </View>
            </View>
          )}

          {/* Recent Activity */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>

                <Text style={styles.sectionSubtitle}>
                  Latest inventory movements
                </Text>
              </View>

              {recentMovements.length > 0 ? (
                <Pressable
                  onPress={() => {
                    const firstMovement = recentMovements[0];
                    const inventory = inventoryById.get(
                      firstMovement.inventoryItemId,
                    );

                    if (inventory) {
                      handleOpenHistory(inventory.productId);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.viewHistoryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.viewHistoryText}>View History</Text>
                </Pressable>
              ) : null}
            </View>

            {recentMovements.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="swap-vertical-outline"
                    size={28}
                    color={colors.textMuted}
                  />
                </View>

                <Text style={styles.emptyTitle}>No activity yet</Text>

                <Text style={styles.emptyText}>
                  Inventory movements will appear here as stock is received,
                  sold, adjusted, removed, or returned.
                </Text>
              </View>
            ) : isTablet ? (
              <RecentActivityTable
                movements={recentMovements}
                inventoryById={inventoryById}
                onProductPress={handleOpenProduct}
              />
            ) : (
              <View style={styles.activityCard}>
                {recentMovements.map((movement, index) => {
                  const inventory = inventoryById.get(movement.inventoryItemId);

                  return (
                    <RecentActivityRow
                      key={movement.id}
                      movement={movement}
                      productName={inventory?.productName ?? "Unknown Product"}
                      unit={inventory?.unit ?? "piece"}
                      isLast={index === recentMovements.length - 1}
                      onPress={
                        inventory
                          ? () => handleOpenProduct(inventory.productId)
                          : undefined
                      }
                    />
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

type SummaryCardProps = {
  width: number;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  description: string;
  helpText?: string;
  onPress?: () => void;
};

function SummaryCard({
  width,
  icon,
  label,
  value,
  description,
  helpText,
}: SummaryCardProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <View style={[styles.summaryCard, { width }]}>
      <View style={styles.summaryCardTop}>
        <View style={styles.summaryIcon}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>

        {helpText ? (
          <Pressable
            onPress={() => setShowHelp((current) => !current)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.helpButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="help-circle-outline"
              size={19}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.summaryLabel}>{label}</Text>

      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>

      <Text style={styles.summaryDescription} numberOfLines={2}>
        {description}
      </Text>

      {showHelp && helpText ? (
        <View style={styles.helpCard}>
          <Text style={styles.helpText}>{helpText}</Text>
        </View>
      ) : null}
    </View>
  );
}

type StockAlertRowProps = {
  item: InventoryItemWithProduct;
  isLast: boolean;
  onPress: () => void;
};

function StockAlertRow({ item, isLast, onPress }: StockAlertRowProps) {
  const status = getStockStatus(item);

  const isOutOfStock = item.currentQuantity <= 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.alertRow,
        !isLast && styles.rowBorder,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[styles.alertIcon, isOutOfStock && styles.alertIconOutOfStock]}
      >
        <Ionicons name={status.icon} size={21} color={colors.primary} />
      </View>

      <View style={styles.alertContent}>
        <Text style={styles.alertProductName} numberOfLines={1}>
          {item.productName}
        </Text>

        <Text style={styles.alertDescription} numberOfLines={1}>
          {isOutOfStock
            ? "No stock available"
            : `Low stock level: ${formatQuantity(
                item.lowStockLevel,
              )} ${item.unit}`}
        </Text>
      </View>

      <View style={styles.alertQuantity}>
        <Text
          style={[
            styles.alertQuantityValue,
            isOutOfStock && styles.alertQuantityOutOfStock,
          ]}
        >
          {formatQuantity(item.currentQuantity)}
        </Text>

        <Text style={styles.alertQuantityUnit}>{item.unit}</Text>
      </View>

      <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
    </Pressable>
  );
}

type RecentActivityRowProps = {
  movement: InventoryMovement;
  productName: string;
  unit: string;
  isLast: boolean;
  onPress?: () => void;
};

function RecentActivityRow({
  movement,
  productName,
  unit,
  isLast,
  onPress,
}: RecentActivityRowProps) {
  const quantityStyle = getMovementQuantityStyle(movement);

  const content = (
    <>
      <View
        style={[
          styles.activityIcon,
          {
            backgroundColor: getMovementIconBackground(movement.movementType),
          },
        ]}
      >
        <Ionicons
          name={getMovementIcon(movement.movementType)}
          size={20}
          color={colors.primary}
        />
      </View>

      <View style={styles.activityContent}>
        <Text style={styles.activityProductName} numberOfLines={1}>
          {productName}
        </Text>

        <Text style={styles.activityMeta} numberOfLines={1}>
          {getMovementLabel(movement.movementType)} ·{" "}
          {formatDateTime(movement.createdAt)}
        </Text>

        {movement.jobOrderNumber ? (
          <Text style={styles.activityReference} numberOfLines={1}>
            {movement.jobOrderNumber}
          </Text>
        ) : movement.reference ? (
          <Text style={styles.activityReference} numberOfLines={1}>
            {movement.reference}
          </Text>
        ) : null}
      </View>

      <View style={styles.activityQuantity}>
        <Text
          style={[
            styles.activityQuantityValue,
            quantityStyle === "positive" && styles.quantityPositive,
            quantityStyle === "negative" && styles.quantityNegative,
          ]}
        >
          {getMovementQuantityText(movement)}
        </Text>

        <Text style={styles.activityQuantityUnit}>{unit}</Text>
      </View>

      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.activityRow, !isLast && styles.rowBorder]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.activityRow,
        !isLast && styles.rowBorder,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

type RecentActivityTableProps = {
  movements: InventoryMovement[];
  inventoryById: Map<number, InventoryItemWithProduct>;
  onProductPress: (productId: number) => void;
};

function RecentActivityTable({
  movements,
  inventoryById,
  onProductPress,
}: RecentActivityTableProps) {
  return (
    <View style={styles.tableCard}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.tableProductColumn]}>
          Product
        </Text>

        <Text style={[styles.tableHeaderText, styles.tableMovementColumn]}>
          Activity
        </Text>

        <Text style={[styles.tableHeaderText, styles.tableQuantityColumn]}>
          Quantity
        </Text>

        <Text style={[styles.tableHeaderText, styles.tableReferenceColumn]}>
          Reference
        </Text>

        <Text style={[styles.tableHeaderText, styles.tableDateColumn]}>
          Date &amp; Time
        </Text>
      </View>

      {movements.map((movement, index) => {
        const inventory = inventoryById.get(movement.inventoryItemId);
        const quantityStyle = getMovementQuantityStyle(movement);

        return (
          <Pressable
            key={movement.id}
            onPress={() => {
              if (inventory) {
                onProductPress(inventory.productId);
              }
            }}
            style={({ pressed }) => [
              styles.tableRow,
              index < movements.length - 1 && styles.tableRowBorder,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.tableProductColumn}>
              <Text style={styles.tablePrimaryText} numberOfLines={1}>
                {inventory?.productName ?? "Unknown Product"}
              </Text>
            </View>

            <View style={styles.tableMovementColumn}>
              <Text style={styles.tablePrimaryText}>
                {getMovementLabel(movement.movementType)}
              </Text>
            </View>

            <View style={styles.tableQuantityColumn}>
              <Text
                style={[
                  styles.tablePrimaryText,
                  quantityStyle === "positive" && styles.quantityPositive,
                  quantityStyle === "negative" && styles.quantityNegative,
                ]}
              >
                {getMovementQuantityText(movement)}
              </Text>

              <Text style={styles.tableMutedText}>
                {inventory?.unit ?? "piece"}
              </Text>
            </View>

            <View style={styles.tableReferenceColumn}>
              {movement.jobOrderNumber ? (
                <Text style={styles.tablePrimaryText} numberOfLines={1}>
                  {movement.jobOrderNumber}
                </Text>
              ) : movement.reference ? (
                <Text style={styles.tablePrimaryText} numberOfLines={1}>
                  {movement.reference}
                </Text>
              ) : (
                <Text style={styles.tableMutedText}>—</Text>
              )}
            </View>

            <View style={styles.tableDateColumn}>
              <Text style={styles.tablePrimaryText} numberOfLines={2}>
                {formatDateTime(movement.createdAt)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  contentContainer: {
    paddingTop: spacing.lg,
    paddingBottom: spacing["3xl"],
  },

  hero: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },

  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },

  heroTitle: {
    ...typography.display,
    color: colors.text,
    textAlign: "center",
  },

  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    minHeight: 158,
  },

  summaryCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  helpButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  summaryValue: {
    ...typography.h2,
    color: colors.text,
    marginTop: 2,
  },

  summaryDescription: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 17,
  },

  helpCard: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: colors.background,
  },

  helpText: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  section: {
    marginTop: spacing["2xl"],
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },

  sectionSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  sectionCount: {
    minWidth: 34,
    height: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionCountText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: "700",
  },

  alertCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  alertRow: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  alertIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  alertIconOutOfStock: {
    backgroundColor: colors.background,
  },

  alertContent: {
    flex: 1,
    minWidth: 0,
  },

  alertProductName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },

  alertDescription: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  alertQuantity: {
    alignItems: "flex-end",
    minWidth: 58,
  },

  alertQuantityValue: {
    ...typography.h3,
    color: colors.text,
  },

  alertQuantityOutOfStock: {
    color: colors.primary,
  },

  alertQuantityUnit: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 1,
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing["2xl"],
    alignItems: "center",
  },

  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },

  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
  },

  emptyText: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginTop: spacing.xs,
    maxWidth: 480,
  },

  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  activityRow: {
    minHeight: 82,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  activityContent: {
    flex: 1,
    minWidth: 0,
  },

  activityProductName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },

  activityMeta: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  activityReference: {
    ...typography.small,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },

  activityQuantity: {
    alignItems: "flex-end",
    minWidth: 54,
  },

  activityQuantityValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },

  activityQuantityUnit: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 1,
  },

  quantityPositive: {
    color: colors.primary,
  },

  quantityNegative: {
    color: colors.text,
  },

  viewHistoryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  viewHistoryText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: "600",
  },

  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  tableHeader: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
  },

  tableHeaderText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "700",
  },

  tableRow: {
    minHeight: 70,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },

  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  tableProductColumn: {
    flex: 1.5,
    paddingRight: spacing.md,
  },

  tableMovementColumn: {
    flex: 1.15,
    paddingRight: spacing.md,
  },

  tableQuantityColumn: {
    width: 90,
    paddingRight: spacing.md,
  },

  tableReferenceColumn: {
    flex: 0.95,
    paddingRight: spacing.md,
  },

  tableDateColumn: {
    width: 145,
  },

  tablePrimaryText: {
    ...typography.small,
    color: colors.text,
    fontWeight: "600",
  },

  tableMutedText: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 1,
  },

  loadingContainer: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
  },

  errorIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    ...typography.h3,
    color: colors.text,
  },

  errorText: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: spacing.xs,
  },

  retryButton: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  retryButtonText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: "700",
  },

  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  pressed: {
    opacity: 0.82,
  },
});
