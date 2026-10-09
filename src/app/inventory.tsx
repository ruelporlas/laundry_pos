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
  TextInput,
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
  getRecentInventoryMovements,
} from "@/repositories/inventoryRepository";

const MAX_CONTENT_WIDTH = 1200;
const PAGE_PADDING = 16;
const GRID_GAP = 16;

type StockFilter = "all" | "low" | "out";

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

function getStockStatus(item: InventoryItemWithProduct): {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
} {
  if (!item.isTrackingEnabled) {
    return {
      label: "Tracking disabled",
      icon: "eye-off-outline",
    };
  }

  if (item.currentQuantity <= 0) {
    return {
      label: "Out of stock",
      icon: "alert-circle-outline",
    };
  }

  if (item.currentQuantity <= item.lowStockLevel) {
    return {
      label: "Low stock",
      icon: "warning-outline",
    };
  }

  return {
    label: "In stock",
    icon: "checkmark-circle-outline",
  };
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
      return "Movement";
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
      return "return-up-back-outline";
    case "adjustment":
      return "options-outline";
    case "stock_removed":
      return "remove-circle-outline";
    default:
      return "swap-horizontal-outline";
  }
}

function getMovementQuantityText(movement: InventoryMovement): string {
  if (movement.movementType === "stock_received") {
    return `+${formatQuantity(Math.abs(movement.quantity))}`;
  }

  if (movement.movementType === "return") {
    return `+${formatQuantity(Math.abs(movement.quantity))}`;
  }

  if (movement.movementType === "sale") {
    return `-${formatQuantity(Math.abs(movement.quantity))}`;
  }

  if (movement.movementType === "stock_removed") {
    return `-${formatQuantity(Math.abs(movement.quantity))}`;
  }

  if (movement.quantity > 0) {
    return `+${formatQuantity(movement.quantity)}`;
  }

  if (movement.quantity < 0) {
    return `-${formatQuantity(Math.abs(movement.quantity))}`;
  }

  return "0";
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
  width,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  helper?: string;
  width: number;
}) {
  return (
    <View style={[styles.summaryCard, { width }]}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={21} color={colors.primary} />
      </View>

      <Text style={styles.summaryLabel}>{label}</Text>

      <Text style={styles.summaryValue}>{value}</Text>

      {helper ? <Text style={styles.summaryHelper}>{helper}</Text> : null}
    </View>
  );
}

export default function InventoryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const availableWidth = contentWidth - PAGE_PADDING * 2;

  const [inventory, setInventory] = useState<InventoryItemWithProduct[]>([]);
  const [recentMovements, setRecentMovements] = useState<InventoryMovement[]>(
    [],
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentLoading, setRecentLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showRecentActivity, setShowRecentActivity] = useState(false);

  const loadInventory = useCallback(async () => {
    try {
      setError("");

      const items = await getAllInventory();

      setInventory(items);
    } catch (loadError) {
      console.error("Failed to load inventory:", loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load inventory.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadRecentActivity = useCallback(async () => {
    try {
      setRecentLoading(true);

      const movements = await getRecentInventoryMovements(20);

      setRecentMovements(movements);
    } catch (loadError) {
      console.error("Failed to load recent inventory activity:", loadError);

      setRecentMovements([]);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadInventory();

    if (showRecentActivity) {
      void loadRecentActivity();
    }
  }, [loadInventory, loadRecentActivity, showRecentActivity]);

  const handleRecentActivityToggle = useCallback(() => {
    if (showRecentActivity) {
      setShowRecentActivity(false);
      return;
    }

    setShowRecentActivity(true);
    void loadRecentActivity();
  }, [loadRecentActivity, showRecentActivity]);

  const trackedCount = inventory.filter(
    (item) => item.isTrackingEnabled,
  ).length;

  const lowStockItems = useMemo(
    () =>
      inventory.filter(
        (item) =>
          item.isTrackingEnabled &&
          item.currentQuantity > 0 &&
          item.currentQuantity <= item.lowStockLevel,
      ),
    [inventory],
  );

  const outOfStockItems = useMemo(
    () =>
      inventory.filter(
        (item) => item.isTrackingEnabled && item.currentQuantity <= 0,
      ),
    [inventory],
  );

  const lowStockCount = lowStockItems.length;
  const outOfStockCount = outOfStockItems.length;

  const inventoryValue = useMemo(
    () =>
      inventory.reduce(
        (total, item) =>
          total +
          (item.isTrackingEnabled
            ? item.currentQuantity * item.costPerUnit
            : 0),
        0,
      ),
    [inventory],
  );

  const filteredInventory = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return inventory.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.productName.toLowerCase().includes(normalizedSearch) ||
        item.productDescription.toLowerCase().includes(normalizedSearch) ||
        item.sku.toLowerCase().includes(normalizedSearch) ||
        item.supplier.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      if (filter === "low") {
        return (
          item.isTrackingEnabled &&
          item.currentQuantity > 0 &&
          item.currentQuantity <= item.lowStockLevel
        );
      }

      if (filter === "out") {
        return item.isTrackingEnabled && item.currentQuantity <= 0;
      }

      return true;
    });
  }, [filter, inventory, search]);

  const summaryCardWidth = isTablet
    ? (availableWidth - GRID_GAP * 3) / 4
    : (availableWidth - GRID_GAP) / 2;

  const cardWidth = isTablet ? (availableWidth - GRID_GAP) / 2 : availableWidth;

  const openProduct = (productId: number) => {
    router.push(`/product-details?id=${productId}`);
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
          Monitor your stock and manage inventory
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
                void loadInventory();
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
              icon="cube-outline"
              label="Tracked Products"
              value={trackedCount.toString()}
              helper="Products using inventory tracking"
              width={summaryCardWidth}
            />

            <SummaryCard
              icon="warning-outline"
              label="Low Stock"
              value={lowStockCount.toString()}
              helper="At or below low-stock level"
              width={summaryCardWidth}
            />

            <SummaryCard
              icon="alert-circle-outline"
              label="Out of Stock"
              value={outOfStockCount.toString()}
              helper="Currently at zero"
              width={summaryCardWidth}
            />

            <SummaryCard
              icon="cash-outline"
              label="Inventory Value"
              value={formatCurrency(inventoryValue)}
              helper="Based on current cost"
              width={summaryCardWidth}
            />
          </View>

          {/* Stock Alerts */}
          {lowStockItems.length > 0 || outOfStockItems.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Stock Alerts</Text>

                  <Text style={styles.sectionSubtitle}>
                    Products that may need attention
                  </Text>
                </View>

                <View style={styles.alertCount}>
                  <Text style={styles.alertCountText}>
                    {lowStockCount + outOfStockCount}
                  </Text>
                </View>
              </View>

              <View style={styles.alertCard}>
                {[...outOfStockItems, ...lowStockItems]
                  .slice(0, 5)
                  .map((item, index, items) => {
                    const isOutOfStock =
                      item.isTrackingEnabled && item.currentQuantity <= 0;

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => openProduct(item.productId)}
                        style={({ pressed }) => [
                          styles.alertRow,
                          index < items.length - 1 && styles.alertRowBorder,
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.alertIcon}>
                          <Ionicons
                            name={
                              isOutOfStock
                                ? "alert-circle-outline"
                                : "warning-outline"
                            }
                            size={19}
                            color={colors.primary}
                          />
                        </View>

                        <View style={styles.alertContent}>
                          <Text
                            style={styles.alertProductName}
                            numberOfLines={1}
                          >
                            {item.productName}
                          </Text>

                          <Text style={styles.alertStockText}>
                            {isOutOfStock
                              ? "Out of stock"
                              : `${formatQuantity(item.currentQuantity)} ${
                                  item.unit
                                } remaining`}
                          </Text>
                        </View>

                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.textMuted}
                        />
                      </Pressable>
                    );
                  })}

                {lowStockItems.length + outOfStockItems.length > 5 ? (
                  <Pressable
                    onPress={() => {
                      setFilter(outOfStockItems.length > 0 ? "out" : "low");
                    }}
                    style={({ pressed }) => [
                      styles.alertFooter,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.alertFooterText}>
                      View all stock alerts
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.primary}
                    />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.allGoodCard}>
              <View style={styles.allGoodIcon}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>

              <View style={styles.allGoodContent}>
                <Text style={styles.allGoodTitle}>Stock looks good</Text>

                <Text style={styles.allGoodText}>
                  No tracked products are currently low or out of stock.
                </Text>
              </View>
            </View>
          )}

          {/* Inventory Management */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderMain}>
                <Text style={styles.sectionTitle}>Stock Management</Text>

                <Text style={styles.sectionSubtitle}>
                  View and manage your current inventory
                </Text>
              </View>

              <Text style={styles.resultCount}>
                {filteredInventory.length} product
                {filteredInventory.length === 1 ? "" : "s"}
              </Text>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={20}
                color={colors.textMuted}
              />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search products..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                returnKeyType="search"
              />

              {search.length > 0 ? (
                <Pressable
                  onPress={() => setSearch("")}
                  hitSlop={8}
                  style={styles.clearSearchButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              ) : null}
            </View>

            {/* Filters */}
            <View style={styles.filterHeader}>
              <View style={styles.filterTitleRow}>
                <Text style={styles.filterTitle}>Stock Status</Text>

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
              </View>
            </View>

            {showHelp ? (
              <View style={styles.helpCard}>
                <Text style={styles.helpText}>
                  Low stock means the quantity has reached or fallen below the
                  product&apos;s low-stock level. Out of stock means the
                  quantity is zero or less. Products with tracking disabled are
                  still sellable, but their sales do not change inventory.
                </Text>
              </View>
            ) : null}

            <View style={styles.filterRow}>
              <FilterButton
                label={`All (${trackedCount})`}
                active={filter === "all"}
                onPress={() => setFilter("all")}
              />

              <FilterButton
                label={`Low Stock (${lowStockCount})`}
                active={filter === "low"}
                onPress={() => setFilter("low")}
              />

              <FilterButton
                label={`Out of Stock (${outOfStockCount})`}
                active={filter === "out"}
                onPress={() => setFilter("out")}
              />
            </View>

            {filteredInventory.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name={
                      search.trim()
                        ? "search-outline"
                        : filter === "out"
                          ? "checkmark-circle-outline"
                          : "cube-outline"
                    }
                    size={28}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  {search.trim()
                    ? "No products found"
                    : filter === "low"
                      ? "No low-stock products"
                      : filter === "out"
                        ? "No out-of-stock products"
                        : "No inventory products"}
                </Text>

                <Text style={styles.emptyText}>
                  {search.trim()
                    ? "Try a different product name, SKU, or supplier."
                    : filter === "low"
                      ? "No tracked products are currently at or below their low-stock level."
                      : filter === "out"
                        ? "All tracked products currently have stock available."
                        : "Inventory records will appear here once products are available."}
                </Text>
              </View>
            ) : isTablet ? (
              <InventoryTable
                items={filteredInventory}
                onProductPress={openProduct}
              />
            ) : (
              <View style={styles.cardGrid}>
                {filteredInventory.map((item) => (
                  <InventoryProductCard
                    key={item.id}
                    item={item}
                    width={cardWidth}
                    onPress={() => openProduct(item.productId)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Recent Activity */}
          <View style={styles.activityLinkContainer}>
            <Pressable
              onPress={handleRecentActivityToggle}
              style={({ pressed }) => [
                styles.activityLink,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={
                  showRecentActivity ? "chevron-up-outline" : "time-outline"
                }
                size={18}
                color={colors.primary}
              />

              <Text style={styles.activityLinkText}>
                {showRecentActivity
                  ? "Hide Recent Activity"
                  : "View Recent Activity"}
              </Text>

              {!showRecentActivity ? (
                <Ionicons
                  name="chevron-down"
                  size={15}
                  color={colors.primary}
                />
              ) : null}
            </Pressable>
          </View>

          {showRecentActivity ? (
            <View style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Recent Activity</Text>

                  <Text style={styles.sectionSubtitle}>
                    Latest inventory movements
                  </Text>
                </View>
              </View>

              {recentLoading ? (
                <View style={styles.activityEmpty}>
                  <ActivityIndicator size="small" color={colors.primary} />

                  <Text style={styles.activityEmptyText}>
                    Loading recent activity...
                  </Text>
                </View>
              ) : recentMovements.length === 0 ? (
                <View style={styles.activityEmpty}>
                  <Ionicons
                    name="time-outline"
                    size={25}
                    color={colors.textMuted}
                  />

                  <Text style={styles.activityEmptyText}>
                    No inventory activity yet.
                  </Text>
                </View>
              ) : (
                recentMovements.slice(0, 10).map((movement, index, items) => (
                  <View
                    key={movement.id}
                    style={[
                      styles.activityRow,
                      index < items.length - 1 && styles.activityRowBorder,
                    ]}
                  >
                    <View style={styles.activityIcon}>
                      <Ionicons
                        name={getMovementIcon(movement.movementType)}
                        size={18}
                        color={colors.primary}
                      />
                    </View>

                    <View style={styles.activityContent}>
                      <Text
                        style={styles.activityProductName}
                        numberOfLines={1}
                      >
                        {movement.jobOrderNumber
                          ? `${getMovementLabel(
                              movement.movementType,
                            )} · ${movement.jobOrderNumber}`
                          : getMovementLabel(movement.movementType)}
                      </Text>

                      <Text
                        style={styles.activityDescription}
                        numberOfLines={2}
                      >
                        {movement.quantity >= 0 ? "+" : ""}
                        {formatQuantity(movement.quantity)} ·{" "}
                        {movement.reference || "No reference"}
                      </Text>

                      <Text style={styles.activityDate}>
                        {formatDateTime(movement.createdAt)}
                      </Text>
                    </View>

                    <View style={styles.activityQuantity}>
                      <Text style={styles.activityQuantityText}>
                        {getMovementQuantityText(movement)}
                      </Text>

                      <Text style={styles.activityBalanceText}>
                        Balance {formatQuantity(movement.balanceAfter)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

type FilterButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function FilterButton({ label, active, onPress }: FilterButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterButton,
        active && styles.filterButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.filterButtonText,
          active && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type InventoryProductCardProps = {
  item: InventoryItemWithProduct;
  width: number;
  onPress: () => void;
};

function InventoryProductCard({
  item,
  width,
  onPress,
}: InventoryProductCardProps) {
  const status = getStockStatus(item);

  const inventoryValue = item.isTrackingEnabled
    ? item.currentQuantity * item.costPerUnit
    : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.productCard,
        { width },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.productCardTop}>
        <View style={styles.productIcon}>
          <Ionicons name="cube-outline" size={23} color={colors.primary} />
        </View>

        <View style={styles.statusBadge}>
          <Ionicons name={status.icon} size={14} color={colors.primary} />

          <Text style={styles.statusBadgeText}>{status.label}</Text>
        </View>
      </View>

      <Text style={styles.productName} numberOfLines={2}>
        {item.productName}
      </Text>

      {item.sku ? (
        <Text style={styles.productSku} numberOfLines={1}>
          SKU: {item.sku}
        </Text>
      ) : null}

      <View style={styles.stockSummary}>
        <View>
          <Text style={styles.stockLabel}>Current Stock</Text>

          <View style={styles.stockValueRow}>
            <Text style={styles.stockValue}>
              {item.isTrackingEnabled
                ? formatQuantity(item.currentQuantity)
                : "—"}
            </Text>

            {item.isTrackingEnabled ? (
              <Text style={styles.stockUnit}>{item.unit}</Text>
            ) : null}
          </View>
        </View>

        {item.isTrackingEnabled ? (
          <View style={styles.inventoryValue}>
            <Text style={styles.stockLabel}>Inventory Value</Text>

            <Text style={styles.inventoryValueText}>
              {formatCurrency(inventoryValue)}
            </Text>
          </View>
        ) : null}
      </View>

      {item.isTrackingEnabled && item.lowStockLevel > 0 ? (
        <Text style={styles.lowStockText}>
          Low stock at {formatQuantity(item.lowStockLevel)} {item.unit}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.viewProductText}>View Product</Text>

        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </View>
    </Pressable>
  );
}

type InventoryTableProps = {
  items: InventoryItemWithProduct[];
  onProductPress: (productId: number) => void;
};

function InventoryTable({ items, onProductPress }: InventoryTableProps) {
  return (
    <View style={styles.tableCard}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.productColumn]}>
          Product
        </Text>

        <Text style={[styles.tableHeaderText, styles.statusColumn]}>
          Status
        </Text>

        <Text style={[styles.tableHeaderText, styles.stockColumn]}>
          Current Stock
        </Text>

        <Text style={[styles.tableHeaderText, styles.lowStockColumn]}>
          Low Stock At
        </Text>

        <Text style={[styles.tableHeaderText, styles.valueColumn]}>
          Inventory Value
        </Text>

        <View style={styles.actionColumn} />
      </View>

      {items.map((item, index) => {
        const status = getStockStatus(item);

        const inventoryValue = item.isTrackingEnabled
          ? item.currentQuantity * item.costPerUnit
          : 0;

        return (
          <Pressable
            key={item.id}
            onPress={() => onProductPress(item.productId)}
            style={({ pressed }) => [
              styles.tableRow,
              index < items.length - 1 && styles.tableRowBorder,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.productColumn}>
              <Text style={styles.tablePrimaryText} numberOfLines={1}>
                {item.productName}
              </Text>

              {item.sku ? (
                <Text style={styles.tableMutedText} numberOfLines={1}>
                  SKU: {item.sku}
                </Text>
              ) : null}
            </View>

            <View style={styles.statusColumn}>
              <View style={styles.tableStatus}>
                <Ionicons name={status.icon} size={15} color={colors.primary} />

                <Text style={styles.tableStatusText}>{status.label}</Text>
              </View>
            </View>

            <View style={styles.stockColumn}>
              <Text style={styles.tablePrimaryText}>
                {item.isTrackingEnabled
                  ? `${formatQuantity(item.currentQuantity)} ${item.unit}`
                  : "—"}
              </Text>
            </View>

            <View style={styles.lowStockColumn}>
              <Text style={styles.tablePrimaryText}>
                {item.isTrackingEnabled
                  ? `${formatQuantity(item.lowStockLevel)} ${item.unit}`
                  : "—"}
              </Text>
            </View>

            <View style={styles.valueColumn}>
              <Text style={styles.tablePrimaryText}>
                {item.isTrackingEnabled ? formatCurrency(inventoryValue) : "—"}
              </Text>
            </View>

            <View style={styles.actionColumn}>
              <Ionicons
                name="chevron-forward"
                size={19}
                color={colors.textMuted}
              />
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
    marginBottom: spacing.xl,
  },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },

  summaryLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },

  summaryValue: {
    ...typography.h2,
    color: colors.text,
    marginTop: 3,
  },

  summaryHelper: {
    ...typography.small,
    color: colors.textMuted,
    lineHeight: 17,
    marginTop: spacing.xs,
  },

  section: {
    marginBottom: spacing.xl,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },

  sectionHeaderMain: {
    flex: 1,
    paddingRight: spacing.md,
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

  resultCount: {
    ...typography.small,
    color: colors.textMuted,
  },

  alertCount: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  alertCountText: {
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
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  alertRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  alertContent: {
    flex: 1,
  },

  alertProductName: {
    ...typography.small,
    color: colors.text,
    fontWeight: "700",
  },

  alertStockText: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  alertFooter: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  alertFooterText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: "700",
  },

  allGoodCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  allGoodIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  allGoodContent: {
    flex: 1,
  },

  allGoodTitle: {
    ...typography.small,
    color: colors.text,
    fontWeight: "700",
  },

  allGoodText: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  searchContainer: {
    minHeight: 52,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.sm,
    paddingVertical: 0,
  },

  clearSearchButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  filterHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  filterTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  filterTitle: {
    ...typography.h3,
    color: colors.text,
  },

  helpButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  helpCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  helpText: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  filterButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: theme.radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  filterButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },

  filterButtonText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  filterButtonTextActive: {
    color: colors.primary,
  },

  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },

  productCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  productCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },

  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  statusBadge: {
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  statusBadgeText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  productName: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
  },

  productSku: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 3,
  },

  stockSummary: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
  },

  stockLabel: {
    ...typography.small,
    color: colors.textMuted,
  },

  stockValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    marginTop: 2,
  },

  stockValue: {
    ...typography.h2,
    color: colors.text,
  },

  stockUnit: {
    ...typography.small,
    color: colors.textSecondary,
  },

  inventoryValue: {
    alignItems: "flex-end",
  },

  inventoryValueText: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
    marginTop: 5,
  },

  lowStockText: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  cardFooter: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  viewProductText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: "700",
  },

  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  tableHeader: {
    minHeight: 50,
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
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },

  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  productColumn: {
    flex: 1.5,
    paddingRight: spacing.md,
  },

  statusColumn: {
    flex: 1.15,
    paddingRight: spacing.md,
  },

  stockColumn: {
    flex: 0.9,
    paddingRight: spacing.md,
  },

  lowStockColumn: {
    flex: 0.9,
    paddingRight: spacing.md,
  },

  valueColumn: {
    flex: 0.95,
    paddingRight: spacing.md,
  },

  actionColumn: {
    width: 30,
    alignItems: "flex-end",
  },

  tablePrimaryText: {
    ...typography.small,
    color: colors.text,
    fontWeight: "600",
  },

  tableMutedText: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },

  tableStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  tableStatusText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  activityLinkContainer: {
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },

  activityLink: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },

  activityLinkText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: "700",
  },

  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },

  activityHeader: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  activityRow: {
    minHeight: 76,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  activityContent: {
    flex: 1,
  },

  activityProductName: {
    ...typography.small,
    color: colors.text,
    fontWeight: "700",
  },

  activityDescription: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  activityDate: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },

  activityQuantity: {
    alignItems: "flex-end",
  },

  activityQuantityText: {
    ...typography.small,
    color: colors.text,
    fontWeight: "700",
  },

  activityBalanceText: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },

  activityEmpty: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },

  activityEmptyText: {
    ...typography.small,
    color: colors.textSecondary,
  },

  loadingContainer: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.sm,
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
    maxWidth: 500,
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

  pressed: {
    opacity: 0.82,
  },
});
