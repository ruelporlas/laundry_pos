import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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
import { useAuth } from "@/context/AuthContext";
import type { InventoryItemWithProduct } from "@/models/inventory";
import type { Product } from "@/models/product";
import {
  getInventoryWithProductByProductId,
  stockOut,
} from "@/repositories/inventoryRepository";
import { getProductById } from "@/repositories/productRepository";

export default function StockOutScreen() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();

  const isTablet = width >= 768;

  const [product, setProduct] = useState<Product | null>(null);
  const [inventory, setInventory] = useState<InventoryItemWithProduct | null>(
    null,
  );

  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [quantityError, setQuantityError] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const loadData = async () => {
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
        setError("");

        const [productResult, inventoryResult] = await Promise.all([
          getProductById(productId),
          getInventoryWithProductByProductId(productId),
        ]);

        if (!productResult) {
          setError("Product not found.");
          setProduct(null);
          setInventory(null);
          return;
        }

        if (!inventoryResult) {
          setError("Inventory information could not be found.");
          setProduct(productResult);
          setInventory(null);
          return;
        }

        setProduct(productResult);
        setInventory(inventoryResult);
      } catch (error) {
        console.error("Failed to load stock-out information:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load stock-out information.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleBackToProduct = () => {
    if (id) {
      router.replace({
        pathname: "/product-details",
        params: { id },
      });
      return;
    }

    router.replace("/products");
  };

  const handleSave = async () => {
    let hasError = false;

    setQuantityError("");
    setReasonError("");
    setError("");

    const trimmedQuantity = quantity.trim();
    const numericQuantity = Number(trimmedQuantity);

    if (!trimmedQuantity) {
      setQuantityError("Quantity is required.");
      hasError = true;
    } else if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      setQuantityError("Enter a quantity greater than zero.");
      hasError = true;
    } else if (inventory && numericQuantity > inventory.currentQuantity) {
      setQuantityError(
        `Only ${inventory.currentQuantity} ${inventory.unit} available.`,
      );
      hasError = true;
    }

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setReasonError("Reason is required.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    if (!product || !inventory) {
      setError("Product inventory information is unavailable.");
      return;
    }

    if (!user?.id) {
      setError("Your user session could not be identified.");
      return;
    }

    try {
      setSaving(true);

      await stockOut({
        productId: product.id,
        quantity: numericQuantity,
        reason: trimmedReason,
        reference: reference.trim(),
        notes: notes.trim(),
        createdBy: user.id,
      });

      // Clear the form only after the stock-out operation succeeds.
      setQuantity("");
      setReason("");
      setReference("");
      setNotes("");
      setQuantityError("");
      setReasonError("");

      router.replace({
        pathname: "/product-details",
        params: {
          id: product.id.toString(),
        },
      });
    } catch (error) {
      console.error("Failed to record stock out:", error);

      setError(
        error instanceof Error ? error.message : "Unable to record stock out.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="arrow-up-circle-outline"
          title="Stock Out"
          subtitle="Loading inventory"
        />

        <LoadingState message="Loading inventory..." />
      </View>
    );
  }

  if (!product || !inventory) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="arrow-up-circle-outline"
          title="Stock Out"
          subtitle="Inventory unavailable"
          onBack={handleBackToProduct}
          disabled={saving}
        />

        <View style={styles.errorScreen}>
          <ErrorState
            title="Unable to load inventory"
            message={error || "Inventory information is unavailable."}
          />

          <AppButton
            title="Back to Product"
            icon="arrow-back"
            onPress={handleBackToProduct}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <PageHero
            icon="arrow-up-circle-outline"
            title="Stock Out"
            subtitle={`Remove stock from ${product.name}`}
            onBack={handleBackToProduct}
            disabled={saving}
          />

          <View style={[styles.content, isTablet && styles.contentTablet]}>
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="warning-outline"
                  size={18}
                  color={colors.danger}
                />

                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <AppCard style={styles.productCard}>
              <View style={styles.productIcon}>
                <Ionicons
                  name="cube-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>

              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>

                <Text style={styles.currentStock}>
                  Current stock:{" "}
                  <Text style={styles.currentStockValue}>
                    {inventory.currentQuantity} {inventory.unit}
                  </Text>
                </Text>
              </View>
            </AppCard>

            <AppCard style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={styles.formHeaderIcon}>
                  <Ionicons
                    name="arrow-up-circle-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.formHeaderText}>
                  <View style={styles.formTitleRow}>
                    <Text style={styles.formTitle}>Remove Stock</Text>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Learn when to use Stock Out"
                      accessibilityHint="Shows information about when to use Stock Out"
                      hitSlop={8}
                      onPress={() => setShowHelp((current) => !current)}
                      style={({ pressed }) => [
                        styles.helpButton,
                        pressed && styles.helpButtonPressed,
                      ]}
                    >
                      <Ionicons
                        name="help-circle-outline"
                        size={20}
                        color={colors.primary}
                      />
                    </Pressable>
                  </View>

                  <Text style={styles.formSubtitle}>
                    Record stock removed from this product.
                  </Text>
                </View>
              </View>

              {showHelp ? (
                <View style={styles.helpCard}>
                  <View style={styles.helpIcon}>
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.helpContent}>
                    <Text style={styles.helpTitle}>
                      When should I use Stock Out?
                    </Text>

                    <Text style={styles.helpText}>
                      Use Stock Out when you intentionally remove inventory
                      without selling it to a customer.
                    </Text>

                    <Text style={styles.helpExamplesLabel}>Examples</Text>

                    <Text style={styles.helpExample}>
                      • Damaged or expired stock
                    </Text>

                    <Text style={styles.helpExample}>
                      • Stock used for personal or shop use
                    </Text>

                    <Text style={styles.helpExample}>
                      • Stock that was intentionally removed
                    </Text>

                    <View style={styles.helpCompare}>
                      <Ionicons
                        name="swap-horizontal-outline"
                        size={17}
                        color={colors.textMuted}
                      />

                      <Text style={styles.helpCompareText}>
                        If the physical count does not match the system count,
                        use{" "}
                        <Text style={styles.helpCompareStrong}>
                          Stock Adjustment
                        </Text>{" "}
                        instead.
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}

              <View style={styles.form}>
                <AppInput
                  label={`Quantity (${inventory.unit})`}
                  value={quantity}
                  onChangeText={(value) => {
                    setQuantity(value);

                    if (value.trim()) {
                      setQuantityError("");
                    }
                  }}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  required
                  error={quantityError}
                  editable={!saving}
                />

                <AppInput
                  label="Reason"
                  value={reason}
                  onChangeText={(value) => {
                    setReason(value);

                    if (value.trim()) {
                      setReasonError("");
                    }
                  }}
                  placeholder="e.g. Damaged, expired, personal use"
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  required
                  error={reasonError}
                  editable={!saving}
                />

                <AppInput
                  label="Reference"
                  value={reference}
                  onChangeText={setReference}
                  placeholder="e.g. Adjustment #123"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!saving}
                />

                <AppInput
                  label="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional notes"
                  autoCapitalize="sentences"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={styles.notesInput}
                  editable={!saving}
                />
              </View>

              <View style={styles.warningHint}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.textMuted}
                />

                <Text style={styles.hintText}>
                  Stock will be reduced by the quantity entered. The removal
                  will be recorded in inventory history.
                </Text>
              </View>
            </AppCard>

            <View style={[styles.actions, isTablet && styles.actionsTablet]}>
              <AppButton
                title="Cancel"
                variant="secondary"
                onPress={handleBackToProduct}
                disabled={saving}
                fullWidth={!isTablet}
              />

              <AppButton
                title="Remove Stock"
                icon="checkmark"
                onPress={handleSave}
                loading={saving}
                disabled={saving}
                fullWidth={!isTablet}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  flex: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: spacing["5xl"],
  },

  content: {
    width: "100%",
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },

  contentTablet: {
    maxWidth: 720,
    alignSelf: "center",
  },

  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
  },

  productIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  productInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.md,
  },

  productName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  currentStock: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.textMuted,
  },

  currentStockValue: {
    color: colors.text,
    fontWeight: "600",
  },

  formCard: {
    padding: spacing.lg,
  },

  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },

  formHeaderIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  formHeaderText: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.md,
  },

  formTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  formTitle: {
    ...typography.h3,
    color: colors.text,
  },

  helpButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
    borderRadius: theme.radius.full,
  },

  helpButtonPressed: {
    opacity: 0.65,
  },

  formSubtitle: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
  },

  helpCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  helpIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.background,
  },

  helpContent: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.sm,
  },

  helpTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  helpText: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 19,
  },

  helpExamplesLabel: {
    marginTop: spacing.md,
    ...typography.caption,
    color: colors.text,
    fontWeight: "600",
  },

  helpExample: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 19,
  },

  helpCompare: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },

  helpCompareText: {
    flex: 1,
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 19,
  },

  helpCompareStrong: {
    color: colors.text,
    fontWeight: "600",
  },

  form: {
    gap: spacing.lg,
  },

  notesInput: {
    minHeight: 90,
    paddingTop: spacing.md,
  },

  warningHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  hintText: {
    flex: 1,
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 19,
  },

  actions: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },

  actionsTablet: {
    flexDirection: "row",
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.dangerLight,
  },

  errorText: {
    flex: 1,
    ...typography.small,
    color: colors.danger,
  },

  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING,
    gap: spacing.lg,
  },
});
