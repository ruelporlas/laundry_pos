import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { theme } from "@/constants/theme";

import type { BundleItemType, CreateBundleItemInput } from "@/models/bundle";
import type { Product } from "@/models/product";
import type { Service } from "@/models/service";

import { createBundle } from "@/repositories/bundleRepository";
import { getProducts } from "@/repositories/productRepository";
import { getServices } from "@/repositories/serviceRepository";

type SelectedItem = CreateBundleItemInput & {
  name: string;
  unitPrice: number;
};

export default function AddBundleScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const [catalogLoading, setCatalogLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [priceError, setPriceError] = useState("");
  const [itemsError, setItemsError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCatalog() {
      try {
        setError("");

        const [productResults, serviceResults] = await Promise.all([
          getProducts(),
          getServices(),
        ]);

        if (!mounted) {
          return;
        }

        setProducts(productResults.filter((product) => product.isActive));

        setServices(serviceResults.filter((service) => service.isActive));
      } catch (loadError) {
        console.error("Failed to load bundle catalog:", loadError);

        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load products and services.",
          );
        }
      } finally {
        if (mounted) {
          setCatalogLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      mounted = false;
    };
  }, []);

  const isSelected = (itemType: BundleItemType, itemId: number) => {
    return selectedItems.some(
      (item) => item.itemType === itemType && item.itemId === itemId,
    );
  };

  const addItem = (
    itemType: BundleItemType,
    itemId: number,
    itemName: string,
    unitPrice: number,
  ) => {
    if (isSelected(itemType, itemId)) {
      return;
    }

    setSelectedItems((current) => [
      ...current,
      {
        itemType,
        itemId,
        quantity: 1,
        name: itemName,
        unitPrice,
      },
    ]);

    setItemsError("");
  };

  const removeItem = (itemType: BundleItemType, itemId: number) => {
    setSelectedItems((current) =>
      current.filter(
        (item) => !(item.itemType === itemType && item.itemId === itemId),
      ),
    );
  };

  const changeQuantity = (
    itemType: BundleItemType,
    itemId: number,
    amount: number,
  ) => {
    setSelectedItems((current) =>
      current.map((item) => {
        if (item.itemType !== itemType || item.itemId !== itemId) {
          return item;
        }

        return {
          ...item,
          quantity: Math.max(1, item.quantity + amount),
        };
      }),
    );
  };

  const handleSave = async () => {
    if (saving) {
      return;
    }

    let hasError = false;

    setNameError("");
    setPriceError("");
    setItemsError("");
    setError("");

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const trimmedPrice = price.trim();

    if (!trimmedName) {
      setNameError("Bundle name is required.");
      hasError = true;
    }

    const numericPrice = Number(trimmedPrice);

    if (!trimmedPrice) {
      setPriceError("Bundle price is required.");
      hasError = true;
    } else if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setPriceError("Enter a valid bundle price.");
      hasError = true;
    }

    if (selectedItems.length === 0) {
      setItemsError("Add at least one product or service to the bundle.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    try {
      setSaving(true);

      const bundle = await createBundle({
        name: trimmedName,
        description: trimmedDescription,
        price: numericPrice,
        items: selectedItems.map((item) => ({
          itemType: item.itemType,
          itemId: item.itemId,
          quantity: item.quantity,
        })),
      });

      router.replace(`/bundle-details?id=${bundle.id}`);
    } catch (saveError) {
      console.error("Failed to create bundle:", saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to create bundle.",
      );

      setSaving(false);
    }
  };

  const renderCatalogItem = (
    itemType: BundleItemType,
    itemId: number,
    itemName: string,
    unitPrice: number,
    description?: string,
  ) => {
    const selected = isSelected(itemType, itemId);

    const isProduct = itemType === "product";

    return (
      <View key={`${itemType}-${itemId}`} style={styles.catalogItem}>
        <View
          style={[
            styles.catalogIcon,
            isProduct ? styles.productIcon : styles.serviceIcon,
          ]}
        >
          <Ionicons
            name={isProduct ? "cube-outline" : "construct-outline"}
            size={20}
            color={isProduct ? colors.primary : colors.accent}
          />
        </View>

        <View style={styles.catalogInfo}>
          <Text style={styles.catalogName} numberOfLines={1}>
            {itemName}
          </Text>

          {description ? (
            <Text style={styles.catalogDescription} numberOfLines={1}>
              {description}
            </Text>
          ) : (
            <Text style={styles.catalogType}>
              {isProduct ? "Product" : "Service"}
            </Text>
          )}

          <Text style={styles.catalogPrice}>₱{unitPrice.toFixed(2)}</Text>
        </View>

        <Pressable
          style={[styles.addButton, selected && styles.addButtonSelected]}
          onPress={() => addItem(itemType, itemId, itemName, unitPrice)}
          disabled={selected || saving}
          accessibilityRole="button"
          accessibilityLabel={
            selected ? `${itemName} already included` : `Add ${itemName}`
          }
        >
          <Ionicons
            name={selected ? "checkmark-circle" : "add-circle-outline"}
            size={24}
            color={selected ? colors.success : colors.primary}
          />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace("/bundles")}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Back to bundles"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.heroIcon}>
          <Ionicons name="gift-outline" size={26} color={colors.primary} />
        </View>

        <Text style={styles.heroTitle}>Add Bundle</Text>

        <Text style={styles.heroSubtitle}>
          Create a new product and service package
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={colors.danger}
              />

              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <AppCard style={styles.formCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Bundle Information</Text>

                <Text style={styles.cardSubtitle}>
                  Set the bundle name, description, and selling price.
                </Text>
              </View>
            </View>

            <View style={styles.formFields}>
              <AppInput
                label="Bundle Name"
                value={name}
                onChangeText={(value) => {
                  setName(value);

                  if (value.trim()) {
                    setNameError("");
                  }
                }}
                placeholder="e.g. Full Service"
                autoCapitalize="words"
                autoCorrect={false}
                required
                error={nameError}
                editable={!saving}
              />

              <AppInput
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Optional bundle description"
                autoCapitalize="sentences"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={styles.descriptionInput}
                editable={!saving}
              />

              <AppInput
                label="Bundle Price"
                value={price}
                onChangeText={(value) => {
                  setPrice(value);

                  if (value.trim()) {
                    setPriceError("");
                  }
                }}
                placeholder="0.00"
                keyboardType="decimal-pad"
                required
                error={priceError}
                editable={!saving}
              />

              <Text style={styles.priceHint}>
                This is the selling price of the bundle. It is independent of
                the current prices of the products and services inside it.
              </Text>
            </View>
          </AppCard>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Included Items</Text>

                <Text style={styles.sectionSubtitle}>
                  Select the products and services included in this bundle.
                </Text>
              </View>

              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>{selectedItems.length}</Text>
              </View>
            </View>

            {itemsError ? (
              <Text style={styles.fieldError}>{itemsError}</Text>
            ) : null}

            {selectedItems.length > 0 ? (
              <View style={styles.selectedItems}>
                {selectedItems.map((item) => (
                  <View
                    key={`${item.itemType}-${item.itemId}`}
                    style={styles.selectedItem}
                  >
                    <View
                      style={[
                        styles.itemIcon,
                        item.itemType === "product"
                          ? styles.productIcon
                          : styles.serviceIcon,
                      ]}
                    >
                      <Ionicons
                        name={
                          item.itemType === "product"
                            ? "cube-outline"
                            : "construct-outline"
                        }
                        size={20}
                        color={
                          item.itemType === "product"
                            ? colors.primary
                            : colors.accent
                        }
                      />
                    </View>

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>

                      <Text style={styles.itemType}>
                        {item.itemType === "product" ? "Product" : "Service"} ·
                        ₱{item.unitPrice.toFixed(2)}
                      </Text>

                      <View style={styles.quantityControls}>
                        <Pressable
                          style={styles.quantityButton}
                          onPress={() =>
                            changeQuantity(item.itemType, item.itemId, -1)
                          }
                          disabled={saving}
                        >
                          <Ionicons
                            name="remove"
                            size={16}
                            color={colors.text}
                          />
                        </Pressable>

                        <Text style={styles.quantityText}>{item.quantity}</Text>

                        <Pressable
                          style={styles.quantityButton}
                          onPress={() =>
                            changeQuantity(item.itemType, item.itemId, 1)
                          }
                          disabled={saving}
                        >
                          <Ionicons name="add" size={16} color={colors.text} />
                        </Pressable>
                      </View>
                    </View>

                    <Pressable
                      style={styles.removeButton}
                      onPress={() =>
                        Alert.alert(
                          "Remove Item",
                          `Remove "${item.name}" from this bundle?`,
                          [
                            {
                              text: "Cancel",
                              style: "cancel",
                            },
                            {
                              text: "Remove",
                              style: "destructive",
                              onPress: () =>
                                removeItem(item.itemType, item.itemId),
                            },
                          ],
                        )
                      }
                      disabled={saving}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.name}`}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={19}
                        color={colors.danger}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noItems}>
                <View style={styles.noItemsIcon}>
                  <Ionicons
                    name="layers-outline"
                    size={26}
                    color={colors.textMuted}
                  />
                </View>

                <Text style={styles.noItemsTitle}>No items added</Text>

                <Text style={styles.noItemsMessage}>
                  Select at least one product or service below.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Products</Text>

                <Text style={styles.sectionSubtitle}>
                  Active products available to add
                </Text>
              </View>
            </View>

            {catalogLoading ? (
              <View style={styles.catalogLoading}>
                <ActivityIndicator size="small" color={colors.primary} />

                <Text style={styles.catalogLoadingText}>
                  Loading products...
                </Text>
              </View>
            ) : products.length === 0 ? (
              <View style={styles.catalogEmpty}>
                <View style={[styles.emptyIcon, styles.productIcon]}>
                  <Ionicons
                    name="cube-outline"
                    size={24}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.catalogEmptyTitle}>No Active Products</Text>

                <Text style={styles.catalogEmptyText}>
                  Create an active product before adding products to a bundle.
                </Text>
              </View>
            ) : (
              <View style={styles.catalogList}>
                {products.map((product) =>
                  renderCatalogItem(
                    "product",
                    product.id,
                    product.name,
                    product.price,
                    product.description,
                  ),
                )}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Services</Text>

                <Text style={styles.sectionSubtitle}>
                  Active services available to add
                </Text>
              </View>
            </View>

            {catalogLoading ? (
              <View style={styles.catalogLoading}>
                <ActivityIndicator size="small" color={colors.primary} />

                <Text style={styles.catalogLoadingText}>
                  Loading services...
                </Text>
              </View>
            ) : services.length === 0 ? (
              <View style={styles.catalogEmpty}>
                <View style={[styles.emptyIcon, styles.serviceIcon]}>
                  <Ionicons
                    name="construct-outline"
                    size={24}
                    color={colors.accent}
                  />
                </View>

                <Text style={styles.catalogEmptyTitle}>No Active Services</Text>

                <Text style={styles.catalogEmptyText}>
                  Create an active service before adding services to a bundle.
                </Text>
              </View>
            ) : (
              <View style={styles.catalogList}>
                {services.map((service) =>
                  renderCatalogItem(
                    "service",
                    service.id,
                    service.name,
                    service.price,
                    service.description,
                  ),
                )}
              </View>
            )}
          </View>

          <View style={styles.priceNote}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.textMuted}
            />

            <Text style={styles.priceNoteText}>
              The bundle price is independent from the individual product and
              service prices.
            </Text>
          </View>

          <View style={styles.actions}>
            <AppButton
              title="Cancel"
              variant="secondary"
              icon="close-outline"
              onPress={() => {
                if (saving) {
                  return;
                }

                router.replace("/bundles");
              }}
              disabled={saving}
              fullWidth
            />

            <AppButton
              title="Save Bundle"
              icon="checkmark-circle-outline"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              fullWidth
            />
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

  hero: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["2xl"],
    backgroundColor: colors.primaryLight,
  },

  backButton: {
    position: "absolute",
    left: spacing.lg,
    top: spacing.lg,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.surface,
  },

  heroIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.lg,
    backgroundColor: colors.surface,
  },

  heroTitle: {
    marginTop: spacing.md,
    ...typography.h1,
    color: colors.text,
    textAlign: "center",
  },

  heroSubtitle: {
    marginTop: spacing.xs,
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
  },

  contentContainer: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing["2xl"],
    paddingBottom: spacing["5xl"],
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.dangerLight,
  },

  errorBannerText: {
    flex: 1,
    ...typography.small,
    color: colors.danger,
  },

  formCard: {
    padding: spacing.lg,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },

  cardHeaderIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  cardHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  cardTitle: {
    ...typography.h3,
    color: colors.text,
  },

  cardSubtitle: {
    marginTop: 2,
    ...typography.small,
    color: colors.textMuted,
  },

  formFields: {
    gap: spacing.lg,
  },

  descriptionInput: {
    minHeight: 96,
    paddingTop: spacing.md,
  },

  priceHint: {
    marginTop: -spacing.sm,
    ...typography.caption,
    color: colors.textMuted,
  },

  section: {
    marginTop: spacing["2xl"],
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    marginTop: spacing.xs,
    ...typography.small,
    color: colors.textMuted,
  },

  itemCountBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.md,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
  },

  itemCountText: {
    ...typography.caption,
    color: colors.primary,
  },

  fieldError: {
    marginBottom: spacing.md,
    ...typography.caption,
    color: colors.danger,
  },

  selectedItems: {
    gap: spacing.sm,
  },

  selectedItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
  },

  itemIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    borderRadius: theme.radius.md,
  },

  productIcon: {
    backgroundColor: colors.primaryLight,
  },

  serviceIcon: {
    backgroundColor: colors.accentLight,
  },

  itemInfo: {
    flex: 1,
    minWidth: 0,
  },

  itemName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  itemType: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
  },

  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: colors.background,
  },

  quantityButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  quantityText: {
    minWidth: 32,
    ...typography.bodyMedium,
    color: colors.text,
    textAlign: "center",
  },

  removeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: colors.dangerLight,
  },

  noItems: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["2xl"],
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
  },

  noItemsIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.background,
  },

  noItemsTitle: {
    marginTop: spacing.sm,
    ...typography.bodyMedium,
    color: colors.text,
  },

  noItemsMessage: {
    marginTop: 3,
    ...typography.small,
    color: colors.textMuted,
    textAlign: "center",
  },

  catalogList: {
    gap: spacing.sm,
  },

  catalogItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 68,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
  },

  catalogIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
  },

  catalogInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.md,
  },

  catalogName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  catalogDescription: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
  },

  catalogType: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
  },

  catalogPrice: {
    marginTop: 3,
    ...typography.small,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  addButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
  },

  addButtonSelected: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },

  catalogLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["2xl"],
  },

  catalogLoadingText: {
    marginLeft: spacing.sm,
    ...typography.small,
    color: colors.textMuted,
  },

  catalogEmpty: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
  },

  emptyIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
  },

  catalogEmptyTitle: {
    marginTop: spacing.md,
    ...typography.h3,
    color: colors.text,
  },

  catalogEmptyText: {
    maxWidth: 320,
    marginTop: spacing.xs,
    ...typography.small,
    color: colors.textMuted,
    textAlign: "center",
  },

  priceNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },

  priceNoteText: {
    flex: 1,
    ...typography.caption,
    color: colors.textMuted,
  },

  actions: {
    gap: spacing.md,
    marginTop: spacing["2xl"],
  },
});
