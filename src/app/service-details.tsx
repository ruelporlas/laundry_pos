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
import type { Service } from "@/models/service";
import {
  getServiceById,
  setServiceActive,
} from "@/repositories/serviceRepository";

export default function ServiceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;

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

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      setError("Invalid service ID.");
      setLoading(false);
      return;
    }

    try {
      setError("");
      setLoading(true);

      const result = await getServiceById(serviceId);

      if (!result) {
        setService(null);
        setError("Service could not be found.");
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

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadOnFocus() {
        if (!id) {
          if (isActive) {
            setError("Service ID is missing.");
            setLoading(false);
          }

          return;
        }

        const serviceId = Number(id);

        if (!Number.isInteger(serviceId) || serviceId <= 0) {
          if (isActive) {
            setError("Invalid service ID.");
            setLoading(false);
          }

          return;
        }

        try {
          if (isActive) {
            setError("");
            setLoading(true);
          }

          const result = await getServiceById(serviceId);

          if (!isActive) {
            return;
          }

          if (!result) {
            setService(null);
            setError("Service could not be found.");
            return;
          }

          setService(result);
        } catch (error) {
          console.error("Failed to load service:", error);

          if (isActive) {
            setError(
              error instanceof Error
                ? error.message
                : "Unable to load service.",
            );
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      }

      loadOnFocus();

      return () => {
        isActive = false;
      };
    }, [id]),
  );

  const handleBackToServices = () => {
    router.replace("/services");
  };

  const handleToggleActive = () => {
    if (!service || processing) {
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
              setError("");

              const updatedService = await setServiceActive(
                service.id,
                nextStatus,
              );

              setService(updatedService);
            } catch (error) {
              console.error("Failed to update service status:", error);

              setError(
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

  if (loading && !service) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="construct-outline"
          title="Service Details"
          subtitle="Loading service..."
          onBack={handleBackToServices}
        />

        <LoadingState message="Loading service..." />
      </View>
    );
  }

  if (error && !service) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="construct-outline"
          title="Service Details"
          subtitle="Service information"
          onBack={handleBackToServices}
        />

        <View style={styles.errorScreen}>
          <ErrorState title="Unable to load service" message={error} />

          <AppButton
            title="Try Again"
            icon="refresh-outline"
            onPress={loadService}
          />
        </View>
      </View>
    );
  }

  if (!service) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PageHero
          icon="construct-outline"
          title={service.name}
          onBack={handleBackToServices}
          disabled={processing}
        >
          <View style={styles.heroIcon}>
            <Ionicons
              name="construct-outline"
              size={28}
              color={colors.primary}
            />
          </View>
        </PageHero>

        <View style={[styles.content, isTablet && styles.contentTablet]}>
          <View style={styles.heroStatus}>
            <StatusBadge
              label={service.isActive ? "Active" : "Inactive"}
              variant={service.isActive ? "success" : "neutral"}
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

          <AppCard padding={spacing.xl}>
            <SectionHeader
              icon="information-circle-outline"
              title="Service Information"
              subtitle="Details and pricing for this service."
            />

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
              onPress={() =>
                router.push({
                  pathname: "/edit-service",
                  params: {
                    id: service.id.toString(),
                  },
                })
              }
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
              disabled={processing}
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

  heroIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.white,
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

  heroStatus: {
    alignItems: "center",
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
    gap: spacing.md,
  },

  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    marginTop: spacing.sm,
  },

  actionsTablet: {
    flexDirection: "row",
  },

  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING,
  },
});
