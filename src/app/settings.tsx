import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import type { AppSettings, ReceiptPaperWidth } from "@/models/settings";
import {
  getAppSettings,
  updateAppSettings,
} from "@/repositories/settingsRepository";

const MAX_CONTENT_WIDTH = 720;

export default function SettingsScreen() {
  const router = useRouter();

  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopContact, setShopContact] = useState("");
  const [claimStubMessage, setClaimStubMessage] = useState("");
  const [receiptPaperWidth, setReceiptPaperWidth] =
    useState<ReceiptPaperWidth>("58mm");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const currentSettings = await getAppSettings();

      setSettings(currentSettings);
      setShopName(currentSettings.shopName);
      setShopAddress(currentSettings.shopAddress);
      setShopContact(currentSettings.shopContact);
      setClaimStubMessage(currentSettings.claimStubMessage);
      setReceiptPaperWidth(currentSettings.receiptPaperWidth);
    } catch (loadError) {
      console.error("Failed to load settings:", loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load settings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!shopName.trim()) {
      Alert.alert("Missing Shop Name", "Please enter your shop name.");
      return;
    }

    if (!claimStubMessage.trim()) {
      Alert.alert(
        "Missing Claim Message",
        "Please enter the message that should appear on the claim stub.",
      );
      return;
    }

    try {
      setSaving(true);

      const updatedSettings = await updateAppSettings({
        shopName,
        shopAddress,
        shopContact,
        claimStubMessage,
        receiptPaperWidth,
      });

      setSettings(updatedSettings);

      Alert.alert("Settings Saved", "Your receipt settings have been updated.");
    } catch (saveError) {
      console.error("Failed to save settings:", saveError);

      Alert.alert(
        "Unable to Save",
        saveError instanceof Error
          ? saveError.message
          : "Something went wrong while saving the settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error || !settings) {
    return (
      <View style={styles.screen}>
        <PageHero
          icon="settings-outline"
          title="Settings"
          subtitle="Configure your POS and receipt information"
        />

        <View style={styles.errorContainer}>
          <ErrorState message={error || "Settings could not be loaded."} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <PageHero
          icon="settings-outline"
          title="Settings"
          subtitle="Configure your POS and receipt information"
        />

        <View style={styles.contentInner}>
          <View style={styles.section}>
            <SectionHeader
              icon="business-outline"
              title="Shop Information"
              subtitle="This information will appear on printed receipts"
            />

            <AppCard padding={spacing.lg} style={styles.card}>
              <Field
                label="Shop Name"
                value={shopName}
                onChangeText={setShopName}
                placeholder="Enter your shop name"
                icon="storefront-outline"
              />

              <Field
                label="Address"
                value={shopAddress}
                onChangeText={setShopAddress}
                placeholder="Enter your shop address"
                icon="location-outline"
                multiline
              />

              <Field
                label="Contact Number"
                value={shopContact}
                onChangeText={setShopContact}
                placeholder="Enter your contact number"
                icon="call-outline"
                keyboardType="phone-pad"
              />
            </AppCard>
          </View>

          <View style={styles.section}>
            <SectionHeader
              icon="receipt-outline"
              title="Receipt Settings"
              subtitle="Control the printed claim stub format"
            />

            <AppCard padding={spacing.lg} style={styles.card}>
              <Text style={styles.fieldLabel}>Paper Width</Text>

              <View style={styles.paperOptions}>
                <PaperOption
                  width="58mm"
                  selected={receiptPaperWidth === "58mm"}
                  onPress={() => setReceiptPaperWidth("58mm")}
                />

                <PaperOption
                  width="80mm"
                  selected={receiptPaperWidth === "80mm"}
                  onPress={() => setReceiptPaperWidth("80mm")}
                />
              </View>

              <Text style={styles.helperText}>
                This determines the receipt layout used by the printer.
              </Text>

              <View style={styles.messageField}>
                <Text style={styles.fieldLabel}>Claim Stub Message</Text>

                <TextInput
                  value={claimStubMessage}
                  onChangeText={setClaimStubMessage}
                  placeholder="Enter the message shown at the bottom of the claim stub"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={styles.textArea}
                />
              </View>

              <View style={styles.tipBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.primary}
                />

                <Text style={styles.tipText}>
                  The claim message is printed on every claim stub. You can
                  change it whenever your shop&apos;s policy changes.
                </Text>
              </View>
            </AppCard>
          </View>

          <View style={styles.actions}>
            <AppButton
              title="Save Settings"
              icon="checkmark-circle-outline"
              fullWidth
              loading={saving}
              onPress={handleSave}
            />

            <AppButton
              title="Cancel"
              variant="secondary"
              fullWidth
              disabled={saving}
              onPress={() => router.back()}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  multiline?: boolean;
  keyboardType?: "default" | "phone-pad";
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  multiline = false,
  keyboardType = "default",
}: FieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Ionicons name={icon} size={17} color={colors.primary} />

        <Text style={styles.fieldLabel}>{label}</Text>
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? "top" : "center"}
        keyboardType={keyboardType}
        style={[styles.input, multiline ? styles.multilineInput : null]}
      />
    </View>
  );
}

type PaperOptionProps = {
  width: ReceiptPaperWidth;
  selected: boolean;
  onPress: () => void;
};

function PaperOption({ width, selected, onPress }: PaperOptionProps) {
  return (
    <AppCard
      padding={spacing.md}
      onPress={onPress}
      style={[styles.paperOption, selected ? styles.paperOptionSelected : null]}
    >
      <View style={[styles.radio, selected ? styles.radioSelected : null]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>

      <View style={styles.paperOptionContent}>
        <Text style={styles.paperOptionTitle}>{width}</Text>

        <Text style={styles.paperOptionSubtitle}>
          {width === "58mm"
            ? "Compact thermal receipt"
            : "Wider thermal receipt"}
        </Text>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingBottom: spacing["4xl"],
  },

  contentInner: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    paddingHorizontal: PAGE_PADDING,
  },

  section: {
    marginTop: spacing["2xl"],
  },

  card: {
    marginTop: spacing.md,
  },

  field: {
    marginBottom: spacing.lg,
  },

  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },

  fieldLabel: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 15,
  },

  multilineInput: {
    minHeight: 90,
    paddingTop: spacing.md,
  },

  paperOptions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },

  paperOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },

  paperOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: colors.primary,
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  paperOptionContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  paperOptionTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  paperOptionSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  helperText: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  messageField: {
    marginTop: spacing.lg,
  },

  textArea: {
    minHeight: 100,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },

  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.primaryLight,
    gap: spacing.sm,
  },

  tipText: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 19,
  },

  actions: {
    marginTop: spacing["2xl"],
    gap: spacing.sm,
  },

  errorContainer: {
    flex: 1,
    padding: PAGE_PADDING,
    justifyContent: "center",
  },
});
