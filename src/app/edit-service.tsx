import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { theme } from "@/constants/theme";
import {
  getServiceById,
  updateService,
} from "@/repositories/serviceRepository";

export default function EditServiceScreen() {
  const params = useLocalSearchParams();
  const id = params.id;

  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? spacing["2xl"] : spacing.lg;

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

    const loadService = async () => {
      const serviceId = Number(id);

      if (!id || !Number.isInteger(serviceId)) {
        if (isMounted) {
          setError("Invalid service ID.");
          setLoading(false);
        }

        return;
      }

      try {
        const service = await getServiceById(serviceId);

        if (!isMounted) {
          return;
        }

        if (!service) {
          setError("Service could not be found.");
          setLoading(false);
          return;
        }

        setName(service.name);
        setDescription(service.description);
        setPrice(service.price.toString());
        setLoading(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Failed to load service:", error);

        setError(
          error instanceof Error ? error.message : "Unable to load service.",
        );

        setLoading(false);
      }
    };

    loadService();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleBackToDetails = () => {
    router.replace(`/service-details?id=${id}`);
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

    if (!Number.isInteger(serviceId)) {
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

      router.replace(`/service-details?id=${serviceId}`);
    } catch (error) {
      console.error("Failed to update service:", error);

      setError(
        error instanceof Error ? error.message : "Unable to update service.",
      );

      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingHero}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBackToDetails}
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

  if (error && !name) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingHero}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBackToDetails}
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

          <Text style={styles.errorMessage}>{error}</Text>

          <AppButton
            title="Go Back"
            icon="arrow-back"
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
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: horizontalPadding,
            },
          ]}
          keyboardShouldPersistTaps="handled"
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
              onPress={handleBackToDetails}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Ionicons name="arrow-back" size={21} color={colors.text} />
            </Pressable>

            <View style={styles.heroIcon}>
              <Ionicons
                name="create-outline"
                size={24}
                color={colors.primary}
              />
            </View>

            <Text style={styles.heroTitle}>Edit Service</Text>

            <Text style={styles.heroSubtitle}>Update service information</Text>
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
                    name="create-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionTitle}>Service Information</Text>

                  <Text style={styles.sectionSubtitle}>
                    Update the service name, description, or selling price.
                  </Text>
                </View>
              </View>

              {error && (
                <View style={styles.errorBanner}>
                  <View style={styles.errorIconSmall}>
                    <Ionicons
                      name="warning-outline"
                      size={18}
                      color={colors.danger}
                    />
                  </View>

                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

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
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.surface,
  },

  heroTitle: {
    marginTop: spacing.md,
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },

  heroSubtitle: {
    marginTop: spacing.xs,
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
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

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.dangerLight,
  },

  errorIconSmall: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.surface,
  },

  errorText: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.small,
    color: colors.danger,
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
