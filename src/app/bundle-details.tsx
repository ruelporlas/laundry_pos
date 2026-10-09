import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";

import type { Bundle } from "@/models/bundle";

import {
  getBundleById,
  setBundleActive,
} from "@/repositories/bundleRepository";

export default function BundleDetailsScreen() {
  const { width } = useWindowDimensions();

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const isTablet = width >= 768;

  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const loadBundle = useCallback(async () => {
    if (!id) {
      setError("Bundle ID is missing.");
      setLoading(false);
      return;
    }

    const bundleId = Number(id);

    if (!Number.isInteger(bundleId)) {
      setError("Invalid bundle ID.");
      setLoading(false);
      return;
    }

    try {
      setError("");

      const result = await getBundleById(bundleId);

      if (!result) {
        setError("Bundle could not be found.");
        setBundle(null);
        return;
      }

      setBundle(result);
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

  useFocusEffect(
    useCallback(() => {
      loadBundle();
    }, [loadBundle]),
  );

  const handleToggleActive = () => {
    if (!bundle) {
      return;
    }

    const nextStatus = !bundle.isActive;

    Alert.alert(
      `${nextStatus ? "Activate" : "Deactivate"} Bundle`,
      `Are you sure you want to ${
        nextStatus ? "activate" : "deactivate"
      } "${bundle.name}"?`,
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
              setProcessing(true);

              const updatedBundle = await setBundleActive(
                bundle.id,
                nextStatus,
              );

              setBundle(updatedBundle);
            } catch (updateError) {
              console.error("Failed to update bundle status:", updateError);

              Alert.alert(
                "Unable to Update",
                updateError instanceof Error
                  ? updateError.message
                  : "The bundle status could not be updated.",
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  const handleBackToBundles = () => {
    router.replace("/bundles");
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="gift-outline"
          title="Bundle Details"
          subtitle="View and manage bundle"
          onBack={handleBackToBundles}
        />

        <LoadingState message="Loading bundle..." />
      </View>
    );
  }

  if (error || !bundle) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="gift-outline"
          title="Bundle Details"
          subtitle="View and manage bundle"
          onBack={handleBackToBundles}
        />

        <ErrorState
          title="Unable to Load Bundle"
          message={error || "The bundle could not be found."}
        />

        <View style={styles.retryButton}>
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
      <PageHero
        icon="gift-outline"
        title="Bundle Details"
        subtitle={bundle.name}
        onBack={handleBackToBundles}
        disabled={processing}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          isTablet && styles.contentTablet,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppCard style={styles.profileCard}>
          <View style={styles.bundleIcon}>
            <Ionicons name="gift-outline" size={32} color={colors.primary} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.bundleName} numberOfLines={2}>
              {bundle.name}
            </Text>

            <StatusBadge
              label={bundle.isActive ? "Active" : "Inactive"}
              variant={bundle.isActive ? "success" : "neutral"}
            />
          </View>
        </AppCard>

        <View style={styles.section}>
          <SectionHeader
            icon="information-circle-outline"
            title="Bundle Information"
          />

          <View style={styles.sectionCardSpacing} />

          <AppCard>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="pricetag-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Bundle Price</Text>

                <Text style={styles.price}>₱{bundle.price.toFixed(2)}</Text>
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
                  {bundle.description || "No description provided."}
                </Text>
              </View>
            </View>
          </AppCard>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Included Items</Text>

              <Text style={styles.sectionDescription}>
                {bundle.items.length}{" "}
                {bundle.items.length === 1 ? "item" : "items"} included in this
                bundle
              </Text>
            </View>
          </View>

          <AppCard padding={0}>
            {bundle.items.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  index < bundle.items.length - 1 && styles.itemDivider,
                ]}
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
                    {item.itemName}
                  </Text>

                  <Text style={styles.itemType}>
                    {item.itemType === "product" ? "Product" : "Service"}
                  </Text>
                </View>

                <View style={styles.itemPricing}>
                  <Text style={styles.itemQuantity}>× {item.quantity}</Text>

                  <Text style={styles.itemUnitPrice}>
                    ₱{item.unitPrice.toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </AppCard>
        </View>

        <View style={styles.priceNote}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.textMuted}
          />

          <Text style={styles.priceNoteText}>
            The prices shown for included items are their current catalog
            prices. The bundle uses its own configured price of ₱
            {bundle.price.toFixed(2)}.
          </Text>
        </View>

        <View style={[styles.actions, isTablet && styles.actionsTablet]}>
          <View style={isTablet ? styles.actionButtonTablet : undefined}>
            <AppButton
              title="Edit Bundle"
              icon="create-outline"
              onPress={() => router.push(`/edit-bundle?id=${bundle.id}`)}
              disabled={processing}
              fullWidth
            />
          </View>

          <View style={isTablet ? styles.actionButtonTablet : undefined}>
            <AppButton
              title={bundle.isActive ? "Deactivate Bundle" : "Activate Bundle"}
              icon={
                bundle.isActive
                  ? "pause-circle-outline"
                  : "checkmark-circle-outline"
              }
              variant={bundle.isActive ? "danger" : "secondary"}
              onPress={handleToggleActive}
              loading={processing}
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

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.xl,
    paddingBottom: spacing["5xl"],
  },

  contentTablet: {
    paddingHorizontal: PAGE_PADDING,
  },

  retryButton: {
    alignSelf: "center",
    paddingHorizontal: PAGE_PADDING,
    marginTop: spacing.lg,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
  },

  bundleIcon: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.lg,
    backgroundColor: colors.primaryLight,
  },

  profileInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },

  bundleName: {
    marginBottom: spacing.sm,
    ...typography.h2,
    color: colors.text,
  },

  section: {
    marginTop: spacing["2xl"],
  },

  sectionCardSpacing: {
    height: spacing.md,
  },

  sectionHeader: {
    marginBottom: spacing.md,
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },

  sectionDescription: {
    marginTop: spacing.xs,
    ...typography.small,
    color: colors.textMuted,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    marginTop: 3,
    ...typography.body,
    color: colors.text,
  },

  price: {
    marginTop: 3,
    ...typography.h2,
    color: colors.primary,
  },

  divider: {
    height: 1,
    marginVertical: spacing.lg,
    backgroundColor: colors.border,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  itemIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
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
    marginLeft: spacing.md,
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

  itemPricing: {
    alignItems: "flex-end",
    marginLeft: spacing.md,
  },

  itemQuantity: {
    ...typography.small,
    fontWeight: "600",
    color: colors.text,
  },

  itemUnitPrice: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
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

  actionsTablet: {
    flexDirection: "row",
  },

  actionButtonTablet: {
    flex: 1,
  },
});
