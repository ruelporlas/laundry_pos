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

  useEffect(() => {
    async function loadCustomer() {
      if (!id) {
        setError("Customer ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const result = await getCustomerById(Number(id));

        if (!result) {
          setError("Customer could not be found.");
          return;
        }

        setCustomer(result);
      } catch (error) {
        console.error("Failed to load customer:", error);

        setError(
          error instanceof Error ? error.message : "Unable to load customer.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [id]);

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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />

          <Text style={styles.loadingText}>Loading customer...</Text>
        </View>
      </View>
    );
  }

  if (error && !customer) {
    return (
      <View style={styles.container}>
        <View style={styles.errorScreen}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={32}
              color={colors.danger}
            />
          </View>

          <Text style={styles.errorTitle}>Customer not found</Text>

          <Text style={styles.errorMessage}>{error}</Text>

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
        <View style={styles.hero}>
          <Pressable
            onPress={handleBackToCustomers}
            disabled={updatingStatus}
            style={({ pressed }) => [
              styles.backButton,
              pressed && !updatingStatus && styles.backButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Back to customers"
          >
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </Pressable>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {customer.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.customerName}>{customer.name}</Text>

          <StatusBadge
            label={customer.isActive ? "Active" : "Inactive"}
            variant={customer.isActive ? "success" : "neutral"}
          />
        </View>

        <View style={[styles.content, isTablet && styles.contentTablet]}>
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

  hero: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 54,
    paddingBottom: 24,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: theme.radius["2xl"],
    borderBottomRightRadius: theme.radius["2xl"],
    backgroundColor: colors.primaryLight,
  },

  backButton: {
    position: "absolute",
    left: spacing.lg,
    top: 54,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.white,
  },

  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },

  avatar: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.white,
  },

  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
  },

  customerName: {
    maxWidth: 520,
    marginTop: spacing.md,
    ...typography.h2,
    color: colors.text,
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

  loadingContainer: {
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

  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
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

  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  actionsTablet: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});
