import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import type {
  InventoryUnit,
  UpdateInventorySettingsInput,
} from "@/models/inventory";
import {
  getInventoryWithProductByProductId,
  updateInventorySettings,
} from "@/repositories/inventoryRepository";

const INVENTORY_UNITS: {
  value: InventoryUnit;
  label: string;
}[] = [
  { value: "piece", label: "Piece" },
  { value: "bottle", label: "Bottle" },
  { value: "sachet", label: "Sachet" },
  { value: "box", label: "Box" },
];

export default function InventorySettingsScreen() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const isTablet = width >= 768;

  const [productName, setProductName] = useState("");
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [unit, setUnit] = useState<InventoryUnit>("piece");
  const [lowStockLevel, setLowStockLevel] = useState("");
  const [sku, setSku] = useState("");
  const [supplier, setSupplier] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lowStockLevelError, setLowStockLevelError] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
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

        const inventory = await getInventoryWithProductByProductId(productId);

        if (!inventory) {
          setError("Inventory settings could not be found.");
          return;
        }

        setProductName(inventory.productName);
        setTrackingEnabled(inventory.isTrackingEnabled);
        setUnit(inventory.unit);
        setLowStockLevel(inventory.lowStockLevel.toString());
        setSku(inventory.sku);
        setSupplier(inventory.supplier);
      } catch (loadError) {
        console.error("Failed to load inventory settings:", loadError);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load inventory settings.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [id]);

  const handleSave = async () => {
    if (!id) {
      setError("Product ID is missing.");
      return;
    }

    const productId = Number(id);

    if (!Number.isInteger(productId) || productId <= 0) {
      setError("Invalid product ID.");
      return;
    }

    setLowStockLevelError("");
    setError(null);

    const parsedLowStockLevel = Number(lowStockLevel);

    if (
      lowStockLevel.trim() === "" ||
      !Number.isFinite(parsedLowStockLevel) ||
      parsedLowStockLevel < 0
    ) {
      setLowStockLevelError("Enter a valid number of 0 or greater.");
      return;
    }

    try {
      setSaving(true);

      const input: UpdateInventorySettingsInput = {
        isTrackingEnabled: trackingEnabled,
        unit,
        lowStockLevel: parsedLowStockLevel,
        sku,
        supplier,
      };

      await updateInventorySettings(productId, input);

      router.replace({
        pathname: "/product-details",
        params: {
          id: productId.toString(),
        },
      });
    } catch (saveError) {
      console.error("Failed to save inventory settings:", saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save inventory settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (!id) {
      router.replace("/products");
      return;
    }

    router.replace({
      pathname: "/product-details",
      params: {
        id,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="settings-outline"
          title="Inventory Settings"
          subtitle="Loading settings"
        />

        <LoadingState message="Loading inventory settings..." />
      </View>
    );
  }

  if (error && !productName) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="settings-outline"
          title="Inventory Settings"
          subtitle="Settings unavailable"
        />

        <View style={styles.errorScreen}>
          <ErrorState title="Unable to load settings" message={error} />

          <AppButton
            title="Back to Product"
            icon="arrow-back"
            onPress={handleBack}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          isTablet && styles.contentTablet,
        ]}
      >
        <PageHero
          icon="settings-outline"
          title="Inventory Settings"
          subtitle={productName}
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={18} color={colors.danger} />

            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <AppCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="eye-outline" size={20} color={colors.primary} />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Inventory Tracking</Text>

              <Text style={styles.sectionSubtitle}>
                Choose whether this product should affect stock levels.
              </Text>
            </View>
          </View>

          <Pressable
            style={[
              styles.toggleRow,
              trackingEnabled && styles.toggleRowEnabled,
            ]}
            onPress={() => setTrackingEnabled((current) => !current)}
          >
            <View style={styles.toggleContent}>
              <View
                style={[
                  styles.toggleIcon,
                  trackingEnabled && styles.toggleIconEnabled,
                ]}
              >
                <Ionicons
                  name={
                    trackingEnabled
                      ? "checkmark-circle-outline"
                      : "close-circle-outline"
                  }
                  size={22}
                  color={trackingEnabled ? colors.success : colors.textMuted}
                />
              </View>

              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>
                  {trackingEnabled ? "Tracking Enabled" : "Tracking Disabled"}
                </Text>

                <Text style={styles.toggleDescription}>
                  {trackingEnabled
                    ? "Sales and stock movements will update inventory."
                    : "The product can still be sold, but sales will not change inventory."}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.switchTrack,
                trackingEnabled && styles.switchTrackEnabled,
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  trackingEnabled && styles.switchThumbEnabled,
                ]}
              />
            </View>
          </Pressable>

          <HelpCard>
            Turn tracking off when you don't want the POS to maintain a stock
            count for this product. Existing inventory history is kept.
          </HelpCard>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Inventory Unit</Text>

              <Text style={styles.sectionSubtitle}>
                Choose how stock is counted for this product.
              </Text>
            </View>
          </View>

          <View style={styles.unitGrid}>
            {INVENTORY_UNITS.map((option) => {
              const selected = unit === option.value;

              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.unitOption,
                    selected && styles.unitOptionSelected,
                  ]}
                  onPress={() => setUnit(option.value)}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      selected && styles.radioOuterSelected,
                    ]}
                  >
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>

                  <Text
                    style={[
                      styles.unitOptionText,
                      selected && styles.unitOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <HelpCard>
            Use one unit consistently for this product. For example, if
            detergent is stocked by bottle, choose Bottle. The system does not
            convert between units.
          </HelpCard>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="warning-outline"
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Low Stock Alert</Text>

              <Text style={styles.sectionSubtitle}>
                Set the quantity where this product should be flagged as low
                stock.
              </Text>
            </View>
          </View>

          <AppInput
            label="Low Stock Level"
            value={lowStockLevel}
            onChangeText={(value) => {
              setLowStockLevel(value);
              setLowStockLevelError("");
            }}
            placeholder="e.g. 5"
            keyboardType="decimal-pad"
            error={lowStockLevelError}
          />

          <HelpCard>
            Example: if you set this to 5 bottles, the product will appear as
            Low Stock when its quantity reaches 5 or below. Set 0 if you don't
            want a low-stock threshold.
          </HelpCard>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="pricetag-outline"
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Product References</Text>

              <Text style={styles.sectionSubtitle}>
                Optional information used to identify and manage stock.
              </Text>
            </View>
          </View>

          <AppInput
            label="SKU"
            value={sku}
            onChangeText={setSku}
            placeholder="Optional"
            autoCapitalize="characters"
          />

          <View style={styles.fieldSpacing} />

          <AppInput
            label="Supplier"
            value={supplier}
            onChangeText={setSupplier}
            placeholder="Optional"
          />

          <HelpCard>
            SKU is an optional product or stock reference code. Supplier is
            simply the name of the supplier you usually get this product from.
          </HelpCard>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.costInfo}>
            <View style={styles.costIcon}>
              <Ionicons
                name="calculator-outline"
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.costText}>
              <Text style={styles.costTitle}>Cost Per Unit</Text>

              <Text style={styles.costDescription}>
                Cost is calculated automatically from stock-in records using
                weighted-average costing. It cannot be edited here.
              </Text>
            </View>
          </View>
        </AppCard>

        <View style={styles.actions}>
          <AppButton
            title="Save Changes"
            icon="checkmark"
            onPress={handleSave}
            loading={saving}
            fullWidth
          />

          <AppButton
            title="Cancel"
            icon="close"
            variant="ghost"
            onPress={handleBack}
            disabled={saving}
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

function HelpCard({ children }: { children: string }) {
  return (
    <View style={styles.helpCard}>
      <Ionicons name="help-circle-outline" size={17} color={colors.textMuted} />

      <Text style={styles.helpText}>{children}</Text>
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

  card: {
    marginHorizontal: PAGE_PADDING,
    marginTop: spacing.lg,
  },

  sectionHeader: {
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

  sectionHeaderText: {
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
    lineHeight: 18,
  },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: colors.background,
  },

  toggleRowEnabled: {
    borderColor: colors.success,
  },

  toggleContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  toggleIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.surface,
  },

  toggleIconEnabled: {
    backgroundColor: colors.successLight,
  },

  toggleTextContainer: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.md,
  },

  toggleTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  toggleDescription: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },

  switchTrack: {
    width: 46,
    height: 26,
    justifyContent: "center",
    paddingHorizontal: 3,
    borderRadius: theme.radius.full,
    backgroundColor: colors.border,
  },

  switchTrackEnabled: {
    backgroundColor: colors.success,
  },

  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.full,
    backgroundColor: colors.surface,
  },

  switchThumbEnabled: {
    alignSelf: "flex-end",
  },

  helpCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.background,
  },

  helpText: {
    flex: 1,
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 19,
  },

  unitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  unitOption: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: colors.background,
  },

  unitOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  radioOuter: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: theme.radius.full,
  },

  radioOuterSelected: {
    borderColor: colors.primary,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primary,
  },

  unitOptionText: {
    marginLeft: spacing.sm,
    ...typography.body,
    color: colors.text,
  },

  unitOptionTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },

  fieldSpacing: {
    height: spacing.md,
  },

  costInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },

  costIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  costText: {
    flex: 1,
    minWidth: 0,
  },

  costTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  costDescription: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 19,
  },

  actions: {
    gap: spacing.md,
    marginHorizontal: PAGE_PADDING,
    marginTop: spacing.xl,
  },
});
