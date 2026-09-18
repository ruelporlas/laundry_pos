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
  View,
  useWindowDimensions,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { theme } from "@/constants/theme";
import type { Customer } from "@/models/customer";
import {
  getCustomerById,
  updateCustomer,
} from "@/repositories/customerRepository";

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;

  const [customer, setCustomer] = useState<Customer | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");

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
        setName(result.name);
        setPhone(result.phone);
        setAddress(result.address);
        setNotes(result.notes);
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

  const handleBackToDetails = () => {
    if (!id) {
      router.replace("/customers");
      return;
    }

    router.replace({
      pathname: "/customer-details",
      params: {
        id,
      },
    });
  };

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError("Customer name is required.");
      return;
    }

    if (!id) {
      setError("Customer ID is missing.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNameError("");

      const updatedCustomer = await updateCustomer(Number(id), {
        name: trimmedName,
        phone,
        address,
        notes,
      });

      setCustomer(updatedCustomer);

      router.replace({
        pathname: "/customer-details",
        params: {
          id: updatedCustomer.id.toString(),
        },
      });
    } catch (error) {
      console.error("Failed to update customer:", error);

      setError(
        error instanceof Error ? error.message : "Unable to update customer.",
      );
    } finally {
      setSaving(false);
    }
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

          <Text style={styles.errorTitle}>Unable to load customer</Text>

          <Text style={styles.errorMessage}>{error}</Text>

          <AppButton
            title="Back to Customer"
            icon="arrow-back-outline"
            onPress={handleBackToDetails}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.hero}>
          <Pressable
            onPress={handleBackToDetails}
            disabled={saving}
            style={({ pressed }) => [
              styles.backButton,
              pressed && !saving && styles.backButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Back to customer details"
          >
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </Pressable>

          <View style={styles.heroIcon}>
            <Ionicons name="create-outline" size={28} color={colors.primary} />
          </View>

          <Text style={styles.title}>Edit Customer</Text>

          <Text style={styles.subtitle} numberOfLines={1}>
            {customer?.name}
          </Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.content, isTablet && styles.contentTablet]}>
            <AppCard padding={spacing.xl} style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Customer information</Text>

                <Text style={styles.formSubtitle}>
                  Update the customer's details below.
                </Text>
              </View>

              {error ? (
                <View style={styles.errorBanner}>
                  <View style={styles.errorBannerIcon}>
                    <Ionicons
                      name="warning-outline"
                      size={19}
                      color={colors.danger}
                    />
                  </View>

                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                <AppInput
                  label="Customer Name"
                  value={name}
                  onChangeText={(value) => {
                    setName(value);

                    if (value.trim()) {
                      setNameError("");
                    }
                  }}
                  placeholder="Enter customer name"
                  autoCapitalize="words"
                  autoCorrect={false}
                  required
                  error={nameError}
                  editable={!saving}
                />

                <AppInput
                  label="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  editable={!saving}
                />

                <AppInput
                  label="Address"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter address"
                  autoCapitalize="sentences"
                  editable={!saving}
                />

                <AppInput
                  label="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes about this customer"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={styles.notesInput}
                  editable={!saving}
                />

                <View
                  style={[styles.actions, isTablet && styles.actionsTablet]}
                >
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
            </AppCard>
          </View>
        </KeyboardAvoidingView>
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
    paddingBottom: 20,
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

  heroIcon: {
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

  subtitle: {
    maxWidth: 360,
    marginTop: spacing.xs,
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
  },

  content: {
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },

  contentTablet: {
    maxWidth: 720,
    alignSelf: "center",
  },

  formCard: {
    width: "100%",
  },

  formHeader: {
    marginBottom: spacing.lg,
  },

  formTitle: {
    ...typography.h3,
    color: colors.text,
  },

  formSubtitle: {
    marginTop: 3,
    ...typography.small,
    color: colors.textMuted,
  },

  form: {
    gap: spacing.lg,
  },

  notesInput: {
    minHeight: 110,
    paddingTop: spacing.md,
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.dangerLight,
  },

  errorBannerIcon: {
    paddingTop: 1,
  },

  errorBannerText: {
    flex: 1,
    ...typography.small,
    color: colors.danger,
  },

  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },

  actionsTablet: {
    flexDirection: "row",
    justifyContent: "flex-end",
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
});
