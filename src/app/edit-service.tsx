import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import {
  getServiceById,
  updateService,
} from "@/repositories/serviceRepository";

export default function EditServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [nameError, setNameError] = useState("");
  const [priceError, setPriceError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadService() {
      if (!id) {
        if (isMounted) {
          setError("Service ID is missing.");
          setLoading(false);
        }

        return;
      }

      const serviceId = Number(id);

      if (!Number.isInteger(serviceId) || serviceId <= 0) {
        if (isMounted) {
          setError("Invalid service ID.");
          setLoading(false);
        }

        return;
      }

      try {
        if (isMounted) {
          setError("");
          setLoading(true);
        }

        const service = await getServiceById(serviceId);

        if (!isMounted) {
          return;
        }

        if (!service) {
          setError("Service could not be found.");
          return;
        }

        setName(service.name);
        setDescription(service.description);
        setPrice(service.price.toFixed(2));
      } catch (error) {
        console.error("Failed to load service:", error);

        if (isMounted) {
          setError(
            error instanceof Error ? error.message : "Unable to load service.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadService();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleBackToDetails = () => {
    if (!id) {
      router.replace("/services");
      return;
    }

    router.replace({
      pathname: "/service-details",
      params: {
        id: String(id),
      },
    });
  };

  const handleSave = async () => {
    let hasError = false;

    setNameError("");
    setPriceError("");
    setError("");

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const trimmedPrice = price.trim();

    if (!trimmedName) {
      setNameError("Service name is required.");
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

    const serviceId = Number(id);

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      setError("Invalid service ID.");
      return;
    }

    try {
      setSaving(true);

      await updateService(serviceId, {
        name: trimmedName,
        description: trimmedDescription,
        price: numericPrice,
      });

      router.replace({
        pathname: "/service-details",
        params: {
          id: serviceId.toString(),
        },
      });
    } catch (error) {
      console.error("Failed to update service:", error);

      setError(
        error instanceof Error ? error.message : "Unable to update service.",
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
          title="Edit Service"
          subtitle="Loading service..."
          onBack={handleBackToDetails}
        />

        <LoadingState message="Loading service..." />
      </View>
    );
  }

  if (error && !name) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="create-outline"
          title="Edit Service"
          subtitle="Service information"
          onBack={handleBackToDetails}
        />

        <View style={styles.errorScreen}>
          <ErrorState title="Unable to load service" message={error} />

          <AppButton
            title="Go Back"
            icon="arrow-back-outline"
            onPress={handleBackToDetails}
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PageHero
            icon="create-outline"
            title="Edit Service"
            subtitle="Update service information"
            onBack={handleBackToDetails}
            disabled={saving}
          />

          <View style={[styles.content, isTablet && styles.contentTablet]}>
            <AppCard padding={spacing.xl}>
              <SectionHeader
                icon="create-outline"
                title="Service Information"
                subtitle="Update the service name, description, or selling price."
              />

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

              <View style={styles.form}>
                <AppInput
                  label="Service Name"
                  value={name}
                  onChangeText={(value) => {
                    setName(value);

                    if (value.trim()) {
                      setNameError("");
                    }
                  }}
                  placeholder="e.g. Wash"
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
                  placeholder="Optional service description"
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
                  Changes will update the configured selling price for this
                  service.
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
  },

  contentTablet: {
    maxWidth: 720,
    alignSelf: "center",
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.dangerLight,
  },

  errorText: {
    flex: 1,
    ...typography.small,
    color: colors.danger,
  },

  form: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },

  descriptionInput: {
    minHeight: 90,
    paddingTop: spacing.md,
  },

  priceHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  priceHintText: {
    flex: 1,
    ...typography.caption,
    color: colors.textMuted,
  },

  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
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
