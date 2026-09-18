import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useCallback, useEffect, useState } from "react";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { theme } from "@/constants/theme";

import type { Bundle, BundleItemType } from "@/models/bundle";
import type { Product } from "@/models/product";
import type { Service } from "@/models/service";

import { getBundleById, updateBundle } from "@/repositories/bundleRepository";
import { getProducts } from "@/repositories/productRepository";
import { getServices } from "@/repositories/serviceRepository";

type SelectedItem = {
  itemType: BundleItemType;
  itemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
};

export default function EditBundleScreen() {
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;

  const { id } = useLocalSearchParams<{
    id?: string;
  }>();

  const [bundle, setBundle] = useState<Bundle | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [priceError, setPriceError] = useState("");
  const [itemsError, setItemsError] = useState("");

  const loadBundle = useCallback(async () => {
    if (!id) {
      setError("Bundle ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const bundleId = Number(id);

      if (!Number.isInteger(bundleId)) {
        throw new Error("Invalid bundle ID.");
      }

      const result = await getBundleById(bundleId);

      if (!result) {
        throw new Error("Bundle could not be found.");
      }

      setBundle(result);
      setName(result.name);
      setDescription(result.description);
      setPrice(String(result.price));

      setSelectedItems(
        result.items.map((item) => ({
          itemType: item.itemType,
          itemId: item.itemId,
          name: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      );
    } catch (loadError) {
      console.error("Failed to load bundle:", loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load bundle.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadCatalog = useCallback(async () => {
    try {
      const [productResults, serviceResults] = await Promise.all([
        getProducts(),
        getServices(),
      ]);

      setProducts(productResults.filter((product) => product.isActive));

      setServices(serviceResults.filter((service) => service.isActive));
    } catch (catalogError) {
      console.error("Failed to load catalog:", catalogError);

      setError(
        catalogError instanceof Error
          ? catalogError.message
          : "Unable to load products and services.",
      );
    }
  }, []);

  useEffect(() => {
    loadBundle();
    loadCatalog();
  }, [loadBundle, loadCatalog]);

  const isItemSelected = (itemType: BundleItemType, itemId: number) => {
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
    if (isItemSelected(itemType, itemId)) {
      return;
    }

    setSelectedItems((current) => [
      ...current,
      {
        itemType,
        itemId,
        name: itemName,
        quantity: 1,
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
    change: number,
  ) => {
    setSelectedItems((current) =>
      current.map((item) => {
        if (item.itemType !== itemType || item.itemId !== itemId) {
          return item;
        }

        return {
          ...item,
          quantity: Math.max(1, item.quantity + change),
        };
      }),
    );
  };

  const handleSave = async () => {
    if (!bundle || saving) {
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

      const updatedBundle = await updateBundle(bundle.id, {
        name: trimmedName,
        description: trimmedDescription,
        price: numericPrice,
        items: selectedItems.map((item) => ({
          itemType: item.itemType,
          itemId: item.itemId,
          quantity: item.quantity,
        })),
      });

      router.replace(`/bundle-details?id=${updatedBundle.id}`);
    } catch (saveError) {
      console.error("Failed to update bundle:", saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update bundle.",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderHero = () => (
    <View style={styles.hero}>
      <Pressable
        onPress={() => router.replace(`/bundle-details?id=${bundle?.id ?? id}`)}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Back to bundle details"
      >
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </Pressable>

      <View style={styles.heroIcon}>
        <Ionicons name="create-outline" size={30} color={colors.primary} />
      </View>

      <Text style={styles.heroTitle}>Edit Bundle</Text>

      <Text style={styles.heroSubtitle} numberOfLines={1}>
        {bundle?.name || "Update bundle information"}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHero()}

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />

          <Text style={styles.loadingText}>Loading bundle...</Text>
        </View>
      </View>
    );
  }

  if (!bundle) {
    return (
      <View style={styles.container}>
        {renderHero()}

        <View style={styles.centerContainer}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={32}
              color={colors.danger}
            />
          </View>

          <Text style={styles.errorTitle}>Unable to Load Bundle</Text>

          <Text style={styles.errorMessage}>
            {error || "The requested bundle could not be found."}
          </Text>

          <AppButton
            title="Try Again"
            icon="refresh-outline"
            onPress={loadBundle}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHero()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          isTablet && styles.contentContainerTablet,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={colors.danger}
            />

            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        <AppCard style={styles.formCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="gift-outline" size={22} color={colors.primary} />
            </View>

            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Bundle Information</Text>

              <Text style={styles.cardSubtitle}>
                Update the basic details of this bundle
              </Text>
            </View>
          </View>

          <View style={styles.fieldSpacing} />

          <AppInput
            label="Bundle Name"
            required
            value={name}
            onChangeText={(value) => {
              setName(value);
              setNameError("");
            }}
            placeholder="e.g. Full Service"
            error={nameError}
            editable={!saving}
          />

          <View style={styles.fieldSpacing} />

          <AppInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={styles.descriptionInput}
            editable={!saving}
          />

          <View style={styles.fieldSpacing} />

          <AppInput
            label="Bundle Price"
            required
            value={price}
            onChangeText={(value) => {
              setPrice(value);
              setPriceError("");
            }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={priceError}
            editable={!saving}
          />

          <Text style={styles.priceHint}>
            This is the selling price of the bundle. It is independent of the
            current prices of the products and services inside it.
          </Text>
        </AppCard>

        <AppCard style={styles.itemsCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.cardTitle}>Included Items</Text>

              <Text style={styles.cardSubtitle}>
                Products and services included in this bundle
              </Text>
            </View>

            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>{selectedItems.length}</Text>
            </View>
          </View>

          {itemsError && <Text style={styles.fieldError}>{itemsError}</Text>}

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
                      {item.itemType === "product" ? "Product" : "Service"} · ₱
                      {item.unitPrice.toFixed(2)}
                    </Text>

                    <View style={styles.quantityControls}>
                      <Pressable
                        style={styles.quantityButton}
                        onPress={() =>
                          changeQuantity(item.itemType, item.itemId, -1)
                        }
                        disabled={saving}
                        accessibilityRole="button"
                        accessibilityLabel={`Decrease ${item.name} quantity`}
                      >
                        <Ionicons name="remove" size={16} color={colors.text} />
                      </Pressable>

                      <Text style={styles.quantityText}>{item.quantity}</Text>

                      <Pressable
                        style={styles.quantityButton}
                        onPress={() =>
                          changeQuantity(item.itemType, item.itemId, 1)
                        }
                        disabled={saving}
                        accessibilityRole="button"
                        accessibilityLabel={`Increase ${item.name} quantity`}
                      >
                        <Ionicons name="add" size={16} color={colors.text} />
                      </Pressable>
                    </View>
                  </View>

                  <Pressable
                    style={styles.removeButton}
                    onPress={() => removeItem(item.itemType, item.itemId)}
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
              <Ionicons
                name="layers-outline"
                size={28}
                color={colors.textMuted}
              />

              <Text style={styles.noItemsTitle}>No items added</Text>

              <Text style={styles.noItemsMessage}>
                Add at least one product or service below.
              </Text>
            </View>
          )}
        </AppCard>

        <AppCard style={styles.catalogCard}>
          <View style={styles.catalogHeader}>
            <View style={styles.catalogHeaderIcon}>
              <Ionicons name="cube-outline" size={22} color={colors.primary} />
            </View>

            <View style={styles.catalogHeaderText}>
              <Text style={styles.cardTitle}>Products</Text>

              <Text style={styles.cardSubtitle}>
                Active products available to add
              </Text>
            </View>
          </View>

          {products.length === 0 ? (
            <View style={styles.catalogEmpty}>
              <Text style={styles.catalogEmptyText}>
                No active products available.
              </Text>
            </View>
          ) : (
            <View style={styles.catalogList}>
              {products.map((product) => {
                const selected = isItemSelected("product", product.id);

                return (
                  <View key={product.id} style={styles.catalogItem}>
                    <View style={[styles.catalogIcon, styles.productIcon]}>
                      <Ionicons
                        name="cube-outline"
                        size={20}
                        color={colors.primary}
                      />
                    </View>

                    <View style={styles.catalogInfo}>
                      <Text style={styles.catalogName} numberOfLines={1}>
                        {product.name}
                      </Text>

                      {product.description ? (
                        <Text
                          style={styles.catalogDescription}
                          numberOfLines={1}
                        >
                          {product.description}
                        </Text>
                      ) : null}

                      <Text style={styles.catalogPrice}>
                        ₱{product.price.toFixed(2)}
                      </Text>
                    </View>

                    <Pressable
                      style={[
                        styles.addButton,
                        selected && styles.addButtonSelected,
                      ]}
                      onPress={() =>
                        addItem(
                          "product",
                          product.id,
                          product.name,
                          product.price,
                        )
                      }
                      disabled={selected || saving}
                      accessibilityRole="button"
                      accessibilityLabel={
                        selected
                          ? `${product.name} already included`
                          : `Add ${product.name}`
                      }
                    >
                      <Ionicons
                        name={
                          selected ? "checkmark-circle" : "add-circle-outline"
                        }
                        size={24}
                        color={selected ? colors.success : colors.primary}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </AppCard>

        <AppCard style={styles.catalogCard}>
          <View style={styles.catalogHeader}>
            <View style={styles.serviceHeaderIcon}>
              <Ionicons
                name="construct-outline"
                size={22}
                color={colors.accent}
              />
            </View>

            <View style={styles.catalogHeaderText}>
              <Text style={styles.cardTitle}>Services</Text>

              <Text style={styles.cardSubtitle}>
                Active services available to add
              </Text>
            </View>
          </View>

          {services.length === 0 ? (
            <View style={styles.catalogEmpty}>
              <Text style={styles.catalogEmptyText}>
                No active services available.
              </Text>
            </View>
          ) : (
            <View style={styles.catalogList}>
              {services.map((service) => {
                const selected = isItemSelected("service", service.id);

                return (
                  <View key={service.id} style={styles.catalogItem}>
                    <View style={[styles.catalogIcon, styles.serviceIcon]}>
                      <Ionicons
                        name="construct-outline"
                        size={20}
                        color={colors.accent}
                      />
                    </View>

                    <View style={styles.catalogInfo}>
                      <Text style={styles.catalogName} numberOfLines={1}>
                        {service.name}
                      </Text>

                      {service.description ? (
                        <Text
                          style={styles.catalogDescription}
                          numberOfLines={1}
                        >
                          {service.description}
                        </Text>
                      ) : null}

                      <Text style={styles.catalogPrice}>
                        ₱{service.price.toFixed(2)}
                      </Text>
                    </View>

                    <Pressable
                      style={[
                        styles.addButton,
                        selected && styles.addButtonSelected,
                      ]}
                      onPress={() =>
                        addItem(
                          "service",
                          service.id,
                          service.name,
                          service.price,
                        )
                      }
                      disabled={selected || saving}
                      accessibilityRole="button"
                      accessibilityLabel={
                        selected
                          ? `${service.name} already included`
                          : `Add ${service.name}`
                      }
                    >
                      <Ionicons
                        name={
                          selected ? "checkmark-circle" : "add-circle-outline"
                        }
                        size={24}
                        color={selected ? colors.success : colors.primary}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </AppCard>

        <View style={[styles.actions, isTablet && styles.actionsTablet]}>
          <View style={isTablet ? styles.actionButtonTablet : undefined}>
            <AppButton
              title="Save Changes"
              icon="checkmark-circle-outline"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              fullWidth
            />
          </View>

          <View style={isTablet ? styles.actionButtonTablet : undefined}>
            <AppButton
              title="Cancel"
              variant="secondary"
              icon="close-outline"
              onPress={() => {
                if (saving) {
                  return;
                }

                router.replace(`/bundle-details?id=${bundle.id}`);
              }}
              disabled={saving}
              fullWidth
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  hero: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: spacing["2xl"],
    borderBottomLeftRadius: theme.radius["2xl"],
    borderBottomRightRadius: theme.radius["2xl"],
    backgroundColor: colors.primaryLight,
  },

  backButton: {
    position: "absolute",
    left: spacing.lg,
    bottom: 22,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.white,
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

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing["5xl"],
  },

  contentContainerTablet: {
    paddingHorizontal: spacing["2xl"],
  },

  centerContainer: {
    flex: 1,
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

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
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
    marginBottom: spacing.lg,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardHeaderIcon: {
    width: 44,
    height: 44,
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
    marginTop: 3,
    ...typography.small,
    color: colors.textMuted,
  },

  fieldSpacing: {
    height: spacing.lg,
  },

  descriptionInput: {
    minHeight: 96,
    paddingTop: spacing.md,
  },

  priceHint: {
    marginTop: spacing.sm,
    ...typography.caption,
    color: colors.textMuted,
  },

  itemsCard: {
    marginBottom: spacing.lg,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },

  sectionHeaderText: {
    flex: 1,
  },

  itemCountBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
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

  catalogCard: {
    marginBottom: spacing.lg,
  },

  catalogHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  catalogHeaderIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  serviceHeaderIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.accentLight,
  },

  catalogHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  catalogList: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  catalogItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: colors.background,
  },

  catalogIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    borderRadius: theme.radius.md,
  },

  catalogInfo: {
    flex: 1,
    minWidth: 0,
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

  catalogPrice: {
    marginTop: 3,
    ...typography.small,
    color: colors.textSecondary,
  },

  addButton: {
    width: 40,
    height: 40,
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

  catalogEmpty: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: colors.background,
  },

  catalogEmptyText: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: "center",
  },

  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  actionsTablet: {
    flexDirection: "row",
  },

  actionButtonTablet: {
    flex: 1,
  },
});
