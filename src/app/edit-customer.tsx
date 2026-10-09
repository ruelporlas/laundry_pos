import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
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
        <LoadingState message="Loading customer..." />
      </View>
    );
  }

  if (error && !customer) {
    return (
      <View style={styles.container}>
        <View style={styles.errorScreen}>
          <ErrorState title="Unable to load customer" message={error} />

          <AppButton
            title="Back to Customer"
            icon="arrow-back-outline"
            onPress={handleBackToDetails}
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
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <PageHero
          icon="create-outline"
          title="Edit Customer"
          subtitle={customer.name}
          onBack={handleBackToDetails}
          disabled={saving}
        />

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

  content: {
    width: "100%",
    paddingHorizontal: PAGE_PADDING,
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

  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING,
  },
});
