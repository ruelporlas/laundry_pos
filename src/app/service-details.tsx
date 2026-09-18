import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { theme } from "@/constants/theme";
import type { Service } from "@/models/service";
import {
  getServiceById,
  setServiceActive,
} from "@/repositories/serviceRepository";

export default function ServiceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? spacing["2xl"] : spacing.lg;

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const loadService = useCallback(async () => {
    if (!id) {
      setError("Service ID is missing.");
      setLoading(false);
      return;
    }

    const serviceId = Number(id);

    if (!Number.isInteger(serviceId)) {
      setError("Invalid service ID.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await getServiceById(serviceId);

      if (!result) {
        setError("Service could not be found.");
        setService(null);
        return;
      }

      setService(result);
    } catch (error) {
      console.error("Failed to load service:", error);

      setError(
        error instanceof Error ? error.message : "Unable to load service.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadService();
  }, [loadService]);

  const handleToggleActive = () => {
    if (!service) {
      return;
    }

    const nextStatus = !service.isActive;
    const action = nextStatus ? "activate" : "deactivate";

    Alert.alert(
      `${nextStatus ? "Activate" : "Deactivate"} Service`,
      `Are you sure you want to ${action} "${service.name}"?`,
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

              const updatedService = await setServiceActive(
                service.id,
                nextStatus,
              );

              setService(updatedService);
            } catch (error) {
              console.error("Failed to update service status:", error);

              Alert.alert(
                "Unable to Update",
                error instanceof Error
                  ? error.message
                  : "The service status could not be updated.",
              );
            } finally {
              setProcessing(false);
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
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.replace("/services")}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />

          <Text style={styles.loadingText}>Loading service...</Text>
        </View>
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingHero}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.replace("/services")}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.centerContent}>
          <View style={styles.errorIcon}>
            <Ionicons name="warning-outline" size={30} color={colors.danger} />
          </View>

          <Text style={styles.errorTitle}>Unable to Load Service</Text>

          <Text style={styles.errorMessage}>
            {error || "The service could not be found."}
          </Text>

          <AppButton title="Try Again" icon="refresh" onPress={loadService} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            {
              marginHorizontal: -horizontalPadding,
              paddingHorizontal: horizontalPadding,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.replace("/services")}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </Pressable>

          <View style={styles.heroIcon}>
            <Ionicons
              name="construct-outline"
              size={28}
              color={colors.primary}
            />
          </View>

          <Text style={styles.heroTitle}>{service.name}</Text>

          <View style={styles.heroStatus}>
            <StatusBadge
              label={service.isActive ? "Active" : "Inactive"}
              variant={service.isActive ? "success" : "neutral"}
            />
          </View>
        </View>

        <View
          style={[
            styles.content,
            {
              maxWidth: isTablet ? 720 : 600,
            },
          ]}
        >
          <AppCard padding={spacing.xl}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Service Information</Text>

                <Text style={styles.sectionSubtitle}>
                  Details and pricing for this service.
                </Text>
              </View>
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Selling Price</Text>

              <Text style={styles.price}>₱{service.price.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.descriptionContainer}>
              <Text style={styles.infoLabel}>Description</Text>

              <Text style={styles.description}>
                {service.description || "No description provided."}
              </Text>
            </View>
          </AppCard>

          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionHeading}>Service Status</Text>

              <StatusBadge
                label={service.isActive ? "Active" : "Inactive"}
                variant={service.isActive ? "success" : "neutral"}
              />
            </View>

            <AppCard>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusIcon,
                    service.isActive
                      ? styles.activeStatusIcon
                      : styles.inactiveStatusIcon,
                  ]}
                >
                  <Ionicons
                    name={
                      service.isActive
                        ? "checkmark-circle-outline"
                        : "pause-circle-outline"
                    }
                    size={22}
                    color={service.isActive ? colors.success : colors.textMuted}
                  />
                </View>

                <View style={styles.statusContent}>
                  <Text style={styles.statusTitle}>
                    {service.isActive
                      ? "Service is active"
                      : "Service is inactive"}
                  </Text>

                  <Text style={styles.statusDescription}>
                    {service.isActive
                      ? "This service can be selected when creating a job order."
                      : "This service is hidden from active service selections."}
                  </Text>
                </View>
              </View>
            </AppCard>
          </View>

          <View style={[styles.actions, isTablet && styles.actionsTablet]}>
            <AppButton
              title="Edit Service"
              icon="create-outline"
              onPress={() => router.push(`/edit-service?id=${service.id}`)}
              disabled={processing}
              fullWidth={!isTablet}
            />

            <AppButton
              title={
                service.isActive ? "Deactivate Service" : "Activate Service"
              }
              icon={
                service.isActive
                  ? "pause-circle-outline"
                  : "checkmark-circle-outline"
              }
              variant={service.isActive ? "danger" : "secondary"}
              onPress={handleToggleActive}
              loading={processing}
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
    flexGrow: 1,
    paddingBottom: spacing["5xl"],
  },

  hero: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 54,
    paddingBottom: 20,
    borderBottomLeftRadius: theme.radius["2xl"],
    borderBottomRightRadius: theme.radius["2xl"],
    backgroundColor: colors.primaryLight,
  },

  loadingHero: {
    minHeight: 88,
    backgroundColor: colors.primaryLight,
  },

  backButton: {
    position: "absolute",
    left: 16,
    top: 18,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.surface,
  },

  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },

  heroIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.surface,
  },

  heroTitle: {
    maxWidth: "90%",
    marginTop: spacing.md,
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },

  heroStatus: {
    marginTop: spacing.sm,
  },

  content: {
    width: "100%",
    alignSelf: "center",
    paddingTop: spacing.xl,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  sectionHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },

  sectionSubtitle: {
    marginTop: 3,
    ...typography.small,
    color: colors.textMuted,
  },

  priceContainer: {
    paddingVertical: spacing.sm,
  },

  priceLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },

  price: {
    marginTop: spacing.xs,
    ...typography.display,
    color: colors.primary,
  },

  divider: {
    height: 1,
    marginVertical: spacing.lg,
    backgroundColor: colors.border,
  },

  descriptionContainer: {
    paddingBottom: spacing.xs,
  },

  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },

  description: {
    marginTop: spacing.xs,
    ...typography.body,
    color: colors.text,
  },

  section: {
    marginTop: spacing["2xl"],
  },

  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },

  sectionHeading: {
    ...typography.h3,
    color: colors.text,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  statusIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
  },

  activeStatusIcon: {
    backgroundColor: colors.successLight,
  },

  inactiveStatusIcon: {
    backgroundColor: colors.background,
  },

  statusContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  statusTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  statusDescription: {
    marginTop: 3,
    ...typography.small,
    color: colors.textMuted,
  },

  actions: {
    gap: spacing.md,
    marginTop: spacing["2xl"],
  },

  actionsTablet: {
    flexDirection: "row",
  },

  centerContent: {
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
});
