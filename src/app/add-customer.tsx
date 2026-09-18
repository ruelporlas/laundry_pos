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
import { createCustomer } from "@/repositories/customerRepository";

export default function AddCustomerScreen() {
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setName("");
    setPhone("");
    setAddress("");
    setNotes("");
    setNameError("");
    setError("");
  }

  async function handleSave() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError("Customer name is required.");
      return;
    }

    setNameError("");
    setError("");
    setSaving(true);

    try {
      await createCustomer({
        name: trimmedName,
        phone,
        address,
        notes,
      });

      resetForm();

      router.replace("/customers");
    } catch (error) {
      console.error("Failed to create customer:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to save customer. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleBackToCustomers() {
    resetForm();
    router.replace("/customers");
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
            onPress={handleBackToCustomers}
            disabled={saving}
            style={({ pressed }) => [
              styles.backButton,
              pressed && !saving && styles.backButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Back to customers"
          >
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </Pressable>

          <View style={styles.heroIcon}>
            <Ionicons
              name="person-add-outline"
              size={28}
              color={colors.primary}
            />
          </View>

          <Text style={styles.title}>Add Customer</Text>

          <Text style={styles.subtitle}>Create a new laundry customer</Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.content, isTablet && styles.contentTablet]}>
            <AppCard padding={spacing.xl} style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Customer information</Text>

                <Text style={styles.formSubtitle}>
                  Add the customer's basic details below.
                </Text>
              </View>

              <View style={styles.form}>
                <AppInput
                  label="Customer Name"
                  placeholder="Enter customer name"
                  value={name}
                  onChangeText={(value) => {
                    setName(value);

                    if (nameError) {
                      setNameError("");
                    }
                  }}
                  error={nameError}
                  required
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!saving}
                />

                <AppInput
                  label="Phone Number"
                  placeholder="Enter phone number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  editable={!saving}
                />

                <AppInput
                  label="Address"
                  placeholder="Enter customer address"
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={styles.multilineInput}
                  editable={!saving}
                />

                <AppInput
                  label="Notes"
                  placeholder="Add any notes about this customer"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={styles.multilineInput}
                  editable={!saving}
                />

                {error ? (
                  <View style={styles.errorContainer}>
                    <View style={styles.errorIcon}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={20}
                        color={colors.danger}
                      />
                    </View>

                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View
                  style={[styles.actions, isTablet && styles.actionsTablet]}
                >
                  <AppButton
                    title="Cancel"
                    variant="secondary"
                    onPress={handleBackToCustomers}
                    disabled={saving}
                    fullWidth={!isTablet}
                  />

                  <AppButton
                    title="Save Customer"
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
    width: "100%",
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

  multilineInput: {
    minHeight: 96,
  },

  errorContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.dangerLight,
  },

  errorIcon: {
    paddingTop: 1,
  },

  errorText: {
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
});
