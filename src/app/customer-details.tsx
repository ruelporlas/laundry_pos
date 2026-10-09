import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import type { Customer } from "@/models/customer";
import {
  getCustomerById,
  setCustomerActive,
} from "@/repositories/customerRepository";

export default function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadCustomer() {
        if (!id) {
          if (isActive) {
            setError("Customer ID is missing.");
            setLoading(false);
          }

          return;
        }

        const customerId = Number(id);

        if (!Number.isInteger(customerId) || customerId <= 0) {
          if (isActive) {
            setError("Invalid customer ID.");
            setLoading(false);
          }

          return;
        }

        try {
          if (isActive) {
            setError("");
            setLoading(true);
          }

          const result = await getCustomerById(customerId);

          if (!isActive) {
            return;
          }

          if (!result) {
            setCustomer(null);
            setError("Customer could not be found.");
            return;
          }

          setCustomer(result);
        } catch (error) {
          console.error("Failed to load customer:", error);

          if (isActive) {
            setError(
              error instanceof Error
                ? error.message
                : "Unable to load customer.",
            );
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      }

      loadCustomer();

      return () => {
        isActive = false;
      };
    }, [id]),
  );

  const handleBackToCustomers = () => {
    router.replace("/customers");
  };

  const handleToggleStatus = () => {
    if (!customer || updatingStatus) {
      return;
    }

    const willActivate = !customer.isActive;

    Alert.alert(
      willActivate ? "Activate Customer?" : "Deactivate Customer?",
      willActivate
        ? "This customer will become available for new transactions again."
        : "This customer will remain in your records but will no longer be available for new transactions.",
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

              const updatedCustomer = await setCustomerActive(
                customer.id,
                willActivate,
              );

              setCustomer(updatedCustomer);
            } catch (error) {
              console.error("Failed to update customer status:", error);

              setError(
                error instanceof Error
                  ? error.message
                  : "Unable to update customer status.",
              );
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
      ],
    );
  };

  if (loading && !customer) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="person-outline"
          title="Customer Details"
          subtitle="Loading customer..."
          onBack={handleBackToCustomers}
        />

        <LoadingState message="Loading customer..." />
      </View>
    );
  }

  if (error && !customer) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="person-outline"
          title="Customer Details"
          subtitle="Customer information"
          onBack={handleBackToCustomers}
        />

        <View style={styles.errorScreen}>
          <ErrorState title="Customer not found" message={error} />

          <AppButton
            title="Back to Customers"
            onPress={handleBackToCustomers}
          />
        </View>
      </View>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PageHero
          icon="person-outline"
          title={customer.name}
          onBack={handleBackToCustomers}
          disabled={updatingStatus}
        >
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>
              {customer.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        </PageHero>

        <View style={[styles.content, isTablet && styles.contentTablet]}>
          <View style={styles.statusContainer}>
            <StatusBadge
              label={customer.isActive ? "Active" : "Inactive"}
              variant={customer.isActive ? "success" : "neutral"}
            />
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="warning-outline"
                size={18}
                color={colors.danger}
              />

              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <AppCard style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Contact Information</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="call-outline"
                  size={19}
                  color={colors.primary}
                />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone Number</Text>

                <Text style={styles.infoValue}>
                  {customer.phone || "No phone number"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="location-outline"
                  size={19}
                  color={colors.primary}
                />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>

                <Text style={styles.infoValue}>
                  {customer.address || "No address"}
                </Text>
              </View>
            </View>
          </AppCard>

          <AppCard style={styles.infoCard}>
            <View style={styles.notesHeader}>
              <View style={styles.notesIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.sectionTitle}>Notes</Text>
            </View>

            <Text style={[styles.notes, !customer.notes && styles.emptyText]}>
              {customer.notes || "No notes"}
            </Text>
          </AppCard>

          <View style={[styles.actions, isTablet && styles.actionsTablet]}>
            <AppButton
              title="Edit Customer"
              icon="create-outline"
              onPress={() =>
                router.push({
                  pathname: "/edit-customer",
                  params: {
                    id: customer.id.toString(),
                  },
                })
              }
              fullWidth={!isTablet}
            />

            <AppButton
              title={
                customer.isActive ? "Deactivate Customer" : "Activate Customer"
              }
              icon={
                customer.isActive
                  ? "pause-circle-outline"
                  : "checkmark-circle-outline"
              }
              variant={customer.isActive ? "danger" : "secondary"}
              onPress={handleToggleStatus}
              loading={updatingStatus}
              disabled={updatingStatus}
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

  heroAvatar: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.white,
  },

  heroAvatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
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

  statusContainer: {
    alignItems: "center",
  },

  infoCard: {
    padding: spacing.lg,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
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

  divider: {
    height: 1,
    marginTop: spacing.lg,
    backgroundColor: colors.border,
  },

  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  notesIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  notes: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.textSecondary,
  },

  emptyText: {
    color: colors.textMuted,
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

  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING,
  },

  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  actionsTablet: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});
