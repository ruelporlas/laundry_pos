import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
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
import { AppInput } from "@/components/ui/AppInput";
import { AppCard } from "@/components/ui/AppCard";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { theme } from "@/constants/theme";
import { createService } from "@/repositories/serviceRepository";

export default function AddServiceScreen() {
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? spacing["2xl"] : spacing.lg;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [nameError, setNameError] = useState("");
  const [priceError, setPriceError] = useState("");

  const handleBackToServices = () => {
    router.replace("/services");
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setError("");
    setNameError("");
    setPriceError("");
  };

  const handleSave = async () => {
    let hasError = false;

    setNameError("");
    setPriceError("");
    setError("");

    const trimmedName = name.trim();
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

    try {
      setSaving(true);

      await createService({
        name: trimmedName,
        description,
        price: numericPrice,
      });

      resetForm();

      router.replace("/services");
    } catch (error) {
      console.error("Failed to create service:", error);

      setError(
        error instanceof Error ? error.message : "Unable to save service.",
      );
    } finally {
      setSaving(false);
    }
  };

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
              onPress={handleBackToServices}
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
                size={24}
                color={colors.primary}
              />
            </View>

            <Text style={styles.heroTitle}>Add Service</Text>

            <Text style={styles.heroSubtitle}>
              Create a new laundry service
            </Text>
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
                    Add the service name, description, and selling price.
                  </Text>
                </View>
              </View>

              {error && (
                <View style={styles.errorBanner}>
                  <View style={styles.errorIcon}>
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
                  This is the configured selling price for the service.
                </Text>
              </View>
            </AppCard>

            <View style={[styles.actions, isTablet && styles.actionsTablet]}>
              <AppButton
                title="Cancel"
                variant="secondary"
                onPress={handleBackToServices}
                disabled={saving}
                fullWidth={!isTablet}
              />

              <AppButton
                title="Save Service"
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

  errorIcon: {
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
});
