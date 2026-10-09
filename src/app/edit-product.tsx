import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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
import type { Product } from "@/models/product";
import {
  getProductById,
  updateProduct,
} from "@/repositories/productRepository";

export default function EditProductScreen() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isTablet = width >= 768;

  const [product, setProduct] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [priceError, setPriceError] = useState("");

  useEffect(() => {
    async function loadProduct() {
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
        const result = await getProductById(productId);

        if (!result) {
          setError("Product could not be found.");
          return;
        }

        setProduct(result);
        setName(result.name);
        setDescription(result.description);
        setPrice(result.price.toFixed(2));
      } catch (error) {
        console.error("Failed to load product:", error);

        setError(
          error instanceof Error ? error.message : "Unable to load product.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  const handleBackToDetails = () => {
    if (!product) {
      router.replace("/products");
      return;
    }

    router.replace({
      pathname: "/product-details",
      params: {
        id: product.id.toString(),
      },
    });
  };

  const handleSave = async () => {
    if (!product) {
      return;
    }

    let hasError = false;

    setNameError("");
    setPriceError("");
    setError("");

    const trimmedName = name.trim();
    const trimmedPrice = price.trim();

    if (!trimmedName) {
      setNameError("Product name is required.");
      hasError = true;
    }

    const numericPrice = Number(trimmedPrice);

    if (!trimmedPrice) {
      setPriceError("Selling price is required.");
      hasError = true;
    } else if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setPriceError("Enter a valid selling price.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    try {
      setSaving(true);

      await updateProduct(product.id, {
        name: trimmedName,
        description,
        price: numericPrice,
      });

      router.replace({
        pathname: "/product-details",
        params: {
          id: product.id.toString(),
        },
      });
    } catch (error) {
      console.error("Failed to update product:", error);

      setError(
        error instanceof Error ? error.message : "Unable to save product.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="create-outline"
          title="Edit Product"
          subtitle="Update product information"
          onBack={() => router.replace("/products")}
        />

        <LoadingState message="Loading product..." />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="create-outline"
          title="Edit Product"
          subtitle="Product information"
          onBack={() => router.replace("/products")}
        />

        <View style={styles.errorScreen}>
          <ErrorState
            title="Unable to edit product"
            message={error || "Product could not be found."}
          />

          <AppButton
            title="Back to Products"
            icon="arrow-back-outline"
            onPress={() => router.replace("/products")}
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
            icon="create-outline"
            title="Edit Product"
            subtitle={product.name}
            onBack={handleBackToDetails}
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

            <AppCard style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={styles.formHeaderIcon}>
                  <Ionicons
                    name="cube-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.formHeaderText}>
                  <Text style={styles.formTitle}>Product Information</Text>

                  <Text style={styles.formSubtitle}>
                    Update the details for this product.
                  </Text>
                </View>
              </View>

              <View style={styles.form}>
                <AppInput
                  label="Product Name"
                  value={name}
                  onChangeText={(value) => {
                    setName(value);

                    if (value.trim()) {
                      setNameError("");
                    }
                  }}
                  placeholder="e.g. Fabcon"
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
                  placeholder="Optional product description"
                  autoCapitalize="sentences"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={styles.descriptionInput}
                  editable={!saving}
                />

                <AppInput
                  label="Selling Price"
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
              </View>

              <View style={styles.priceHint}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.textMuted}
                />

                <Text style={styles.priceHintText}>
                  Enter the regular selling price in Philippine pesos.
                </Text>
              </View>
            </AppCard>

            <View style={[styles.actions, isTablet && styles.actionsTablet]}>
              <AppButton
                title="Cancel"
                variant="secondary"
                onPress={handleBackToDetails}
                disabled={saving}
                fullWidth={!isTablet}
              />

              <AppButton
                title="Save Changes"
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
    marginLeft: spacing.md,
  },

  formTitle: {
    ...typography.h3,
    color: colors.text,
  },

  formSubtitle: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
  },

  form: {
    gap: spacing.lg,
  },

  descriptionInput: {
    minHeight: 90,
    paddingTop: spacing.md,
  },

  priceHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  priceHintText: {
    flex: 1,
    ...typography.caption,
    color: colors.textMuted,
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
  },
});
