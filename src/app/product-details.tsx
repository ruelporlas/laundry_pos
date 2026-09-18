import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { StatusBadge } from "@/components/ui/StatusBadge";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { theme } from "@/constants/theme";
import type { Product } from "@/models/product";
import {
  getProductById,
  setProductActive,
} from "@/repositories/productRepository";

export default function ProductDetailsScreen() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isTablet = width >= 768;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState("");

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
        setError("");

        const result = await getProductById(productId);

        if (!result) {
          setError("Product could not be found.");
          return;
        }

        setProduct(result);
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

  const handleToggleStatus = () => {
    if (!product || updatingStatus) {
      return;
    }

    const willActivate = !product.isActive;

    Alert.alert(
      willActivate ? "Activate Product?" : "Deactivate Product?",
      willActivate
        ? "This product will become available for new transactions again."
        : "This product will remain in your records but will no longer be available for new transactions.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: willActivate ? "Activate" : "Deactivate",
          style: willActivate ? "default" : "destructive",
          onPress: async () => {
            try {
              setUpdatingStatus(true);
              setError("");

              const updatedProduct = await setProductActive(
                product.id,
                willActivate,
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
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingHero}>
          <Pressable
            onPress={() => router.replace("/products")}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.loadingIcon}>
            <Ionicons name="cube-outline" size={28} color={colors.primary} />
          </View>

          <Text style={styles.loadingTitle}>Product Details</Text>
        </View>

        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />

          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </View>
    );
  }

  if (error && !product) {
    return (
      <View style={styles.container}>
        <View style={styles.hero}>
          <Pressable
            onPress={() => router.replace("/products")}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.heroIcon}>
            <Ionicons name="cube-outline" size={28} color={colors.primary} />
          </View>

          <Text style={styles.title}>Product Details</Text>

          <Text style={styles.subtitle}>Product information</Text>
        </View>

        <View style={styles.centerState}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={32}
              color={colors.danger}
            />
          </View>

          <Text style={styles.errorTitle}>Product not found</Text>

          <Text style={styles.errorMessage}>{error}</Text>

          <AppButton
            title="Back to Products"
            icon="arrow-back-outline"
            onPress={() => router.replace("/products")}
          />
        </View>
      </View>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
      >
        <View style={styles.hero}>
          <Pressable
            onPress={() => router.replace("/products")}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.heroIcon}>
            <Ionicons name="cube-outline" size={30} color={colors.primary} />
          </View>

          <Text style={styles.title}>Product Details</Text>

          <Text style={styles.subtitle} numberOfLines={1}>
            {product.name}
          </Text>
        </View>

        <View style={[styles.content, isTablet && styles.contentTablet]}>
          <AppCard style={styles.profileCard}>
            <View style={styles.productIcon}>
              <Ionicons name="cube-outline" size={38} color={colors.primary} />
            </View>

            <Text style={styles.productName}>{product.name}</Text>

            <StatusBadge
              label={product.isActive ? "Active" : "Inactive"}
              variant={product.isActive ? "success" : "neutral"}
            />
          </AppCard>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons
                name="warning-outline"
                size={18}
                color={colors.danger}
              />

              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <AppCard style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Product Information</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="pricetag-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Selling Price</Text>

                <Text style={styles.price}>₱{product.price.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Description</Text>

                <Text style={styles.infoValue}>
                  {product.description || "No description"}
                </Text>
              </View>
            </View>
          </AppCard>

          <View style={[styles.actions, isTablet && styles.actionsTablet]}>
            <AppButton
              title="Edit Product"
              icon="create-outline"
              onPress={() =>
                router.push({
                  pathname: "/edit-product",
                  params: {
                    id: product.id.toString(),
                  },
                })
              }
              fullWidth={!isTablet}
            />

            <AppButton
              title={
                product.isActive ? "Deactivate Product" : "Activate Product"
              }
              icon={
                product.isActive
                  ? "pause-circle-outline"
                  : "checkmark-circle-outline"
              }
              variant={product.isActive ? "danger" : "secondary"}
              onPress={handleToggleStatus}
              loading={updatingStatus}
              fullWidth={!isTablet}
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

  scrollContent: {
    paddingBottom: spacing["5xl"],
  },

  scrollContentTablet: {
    paddingBottom: spacing["5xl"],
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

  loadingHero: {
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
    top: 52,
    left: spacing.lg,
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

  loadingIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.white,
  },

  title: {
    marginTop: spacing.md,
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },

  loadingTitle: {
    marginTop: spacing.md,
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },

  subtitle: {
    maxWidth: "80%",
    marginTop: spacing.xs,
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
  },

  content: {
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },

  contentTablet: {
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 0,
  },

  profileCard: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
  },

  productIcon: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
  },

  productName: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },

  infoCard: {
    padding: spacing.lg,
  },

  sectionTitle: {
    marginBottom: spacing.lg,
    ...typography.h3,
    color: colors.text,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },

  infoValue: {
    marginTop: 2,
    ...typography.body,
    color: colors.text,
  },

  price: {
    marginTop: 2,
    ...typography.h3,
    color: colors.text,
  },

  divider: {
    height: 1,
    marginVertical: spacing.lg,
    backgroundColor: colors.border,
  },

  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
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

  errorBannerText: {
    flex: 1,
    ...typography.small,
    color: colors.danger,
  },

  centerState: {
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
    maxWidth: 420,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },

  pressed: {
    opacity: 0.8,
  },
});
