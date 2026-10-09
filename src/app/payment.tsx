import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
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
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import type {
  DiscountType,
  JobOrderDraftItem,
  PaymentMethod,
} from "@/models/jobOrder";
import { calculateJobOrderTotals } from "@/repositories/jobOrderRepository";

type DraftParams = {
  customerId: number | null;
  items: JobOrderDraftItem[];
  discountType: DiscountType | null;
  discountValue: number;
  notes: string;
};

const MAX_CONTENT_WIDTH = 720;

export default function PaymentScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    draft?: string;
  }>();

  const { width } = useWindowDimensions();

  const isTablet = width >= 768;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const [cashReceived, setCashReceived] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");

  const draft = useMemo<DraftParams | null>(() => {
    if (!params.draft) {
      return null;
    }

    try {
      const parsed = JSON.parse(params.draft) as DraftParams;

      if (!parsed || !Array.isArray(parsed.items) || !parsed.customerId) {
        return null;
      }

      return parsed;
    } catch (error) {
      console.error("Failed to parse payment draft:", error);

      return null;
    }
  }, [params.draft]);

  const totals = useMemo(() => {
    if (!draft) {
      return null;
    }

    return calculateJobOrderTotals(
      draft.items,
      draft.discountType,
      draft.discountValue,
    );
  }, [draft]);

  const enteredCash = parseAmount(cashReceived);
  const enteredAmount = parseAmount(amountPaid);

  const paymentAmount =
    paymentMethod === "cash"
      ? Math.min(enteredCash, totals?.total ?? 0)
      : Math.min(enteredAmount, totals?.total ?? 0);

  const balance = roundCurrency(
    Math.max((totals?.total ?? 0) - paymentAmount, 0),
  );

  const change =
    paymentMethod === "cash"
      ? roundCurrency(Math.max(enteredCash - (totals?.total ?? 0), 0))
      : 0;

  const paymentStatus =
    totals?.total === undefined
      ? "unpaid"
      : totals.total <= 0
        ? "paid"
        : paymentAmount >= totals.total
          ? "paid"
          : paymentAmount > 0
            ? "partially_paid"
            : "unpaid";

  function formatCurrency(amount: number): string {
    return `₱${amount.toFixed(2)}`;
  }

  function handleCashReceived(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, "");

    setCashReceived(cleaned);
  }

  function handleAmountPaid(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, "");

    setAmountPaid(cleaned);
  }

  function handlePaymentMethod(method: PaymentMethod) {
    setPaymentMethod(method);

    if (method === "cash") {
      setAmountPaid("");
      setReferenceNumber("");
    } else {
      setCashReceived("");
    }
  }

  function handleCompleteJobOrder() {
    if (!draft || !totals) {
      Alert.alert(
        "Payment unavailable",
        "The Job Order information could not be loaded.",
      );

      return;
    }

    if (paymentMethod === "cash") {
      if (enteredCash <= 0) {
        Alert.alert(
          "Payment required",
          "Please enter the cash received from the customer.",
        );

        return;
      }
    } else {
      if (enteredAmount <= 0) {
        Alert.alert(
          "Payment required",
          "Please enter the amount paid through GCash.",
        );

        return;
      }

      if (enteredAmount > totals.total) {
        Alert.alert(
          "Invalid amount",
          "GCash payment cannot be greater than the amount due.",
        );

        return;
      }
    }

    Alert.alert(
      "Payment ready",
      "The Job Order will be saved in the next step.",
    );
  }

  function handleBackToOrder() {
    if (!draft) {
      router.replace("/new-job-order");

      return;
    }

    router.replace({
      pathname: "/new-job-order",
      params: {
        draft: JSON.stringify(draft),
      },
    });
  }

  if (!draft || !totals) {
    return (
      <View style={styles.invalidScreen}>
        <ErrorState
          title="Payment unavailable"
          message="The Job Order information could not be loaded."
        />

        <View style={styles.invalidAction}>
          <AppButton
            title="Back to New Job Order"
            icon="arrow-back"
            onPress={() => router.replace("/new-job-order")}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PageHero
        icon="card-outline"
        title="Payment"
        subtitle="Complete this sales transaction"
        onBack={handleBackToOrder}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: MAX_CONTENT_WIDTH,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppCard padding={spacing.lg} style={styles.amountCard}>
          <Text style={styles.amountLabel}>AMOUNT DUE</Text>

          <Text style={styles.amountValue}>{formatCurrency(totals.total)}</Text>

          <View style={styles.amountMeta}>
            <Text style={styles.amountMetaLabel}>Subtotal</Text>

            <Text style={styles.amountMetaValue}>
              {formatCurrency(totals.subtotal)}
            </Text>
          </View>

          {totals.discountAmount > 0 ? (
            <View style={styles.amountMeta}>
              <Text style={styles.amountMetaLabel}>Discount</Text>

              <Text style={styles.discountValue}>
                -{formatCurrency(totals.discountAmount)}
              </Text>
            </View>
          ) : null}
        </AppCard>

        <AppCard padding={spacing.lg} style={styles.paymentCard}>
          <SectionHeader
            icon="wallet-outline"
            title="Payment Method"
            subtitle="How is the customer paying?"
          />

          <View style={[styles.methodRow, isTablet && styles.methodRowTablet]}>
            <Pressable
              onPress={() => handlePaymentMethod("cash")}
              style={[
                styles.methodButton,
                paymentMethod === "cash" && styles.methodButtonActive,
              ]}
            >
              <View
                style={[
                  styles.methodIcon,
                  paymentMethod === "cash" && styles.methodIconActive,
                ]}
              >
                <Ionicons
                  name="cash-outline"
                  size={23}
                  color={
                    paymentMethod === "cash"
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
              </View>

              <View style={styles.methodInfo}>
                <Text
                  style={[
                    styles.methodTitle,
                    paymentMethod === "cash" && styles.methodTitleActive,
                  ]}
                >
                  Cash
                </Text>

                <Text style={styles.methodDescription}>Cash received</Text>
              </View>

              {paymentMethod === "cash" ? (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.success}
                />
              ) : null}
            </Pressable>

            <Pressable
              onPress={() => handlePaymentMethod("gcash")}
              style={[
                styles.methodButton,
                paymentMethod === "gcash" && styles.methodButtonActive,
              ]}
            >
              <View
                style={[
                  styles.methodIcon,
                  styles.gcashIcon,
                  paymentMethod === "gcash" && styles.methodIconActive,
                ]}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={23}
                  color={
                    paymentMethod === "gcash"
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
              </View>

              <View style={styles.methodInfo}>
                <Text
                  style={[
                    styles.methodTitle,
                    paymentMethod === "gcash" && styles.methodTitleActive,
                  ]}
                >
                  GCash
                </Text>

                <Text style={styles.methodDescription}>Electronic payment</Text>
              </View>

              {paymentMethod === "gcash" ? (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.success}
                />
              ) : null}
            </Pressable>
          </View>
        </AppCard>

        {paymentMethod === "cash" ? (
          <AppCard padding={spacing.lg} style={styles.paymentCard}>
            <SectionHeader
              icon="cash-outline"
              title="Cash Payment"
              subtitle="Enter the cash received from the customer"
            />

            <AppInput
              label="Cash Received"
              required
              value={cashReceived}
              onChangeText={handleCashReceived}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            <View style={styles.calculationBox}>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Amount Applied</Text>

                <Text style={styles.calculationValue}>
                  {formatCurrency(paymentAmount)}
                </Text>
              </View>

              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Balance</Text>

                <Text
                  style={[
                    styles.calculationValue,
                    balance === 0 && styles.successValue,
                  ]}
                >
                  {formatCurrency(balance)}
                </Text>
              </View>

              <View style={styles.calculationDivider} />

              <View style={styles.changeRow}>
                <Text style={styles.changeLabel}>Change</Text>

                <Text style={styles.changeValue}>{formatCurrency(change)}</Text>
              </View>
            </View>
          </AppCard>
        ) : (
          <AppCard padding={spacing.lg} style={styles.paymentCard}>
            <SectionHeader
              icon="phone-portrait-outline"
              title="GCash Payment"
              subtitle="Enter the amount paid and optional reference"
            />

            <AppInput
              label="Amount Paid"
              required
              value={amountPaid}
              onChangeText={handleAmountPaid}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            <AppInput
              label="Reference Number"
              value={referenceNumber}
              onChangeText={setReferenceNumber}
              placeholder="Optional"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <View style={styles.calculationBox}>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Amount Applied</Text>

                <Text style={styles.calculationValue}>
                  {formatCurrency(paymentAmount)}
                </Text>
              </View>

              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Balance</Text>

                <Text
                  style={[
                    styles.calculationValue,
                    balance === 0 && styles.successValue,
                  ]}
                >
                  {formatCurrency(balance)}
                </Text>
              </View>
            </View>
          </AppCard>
        )}

        <AppCard padding={spacing.lg} style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>PAYMENT STATUS</Text>

            <View
              style={[
                styles.statusBadge,
                paymentStatus === "paid" && styles.statusPaid,
                paymentStatus === "partially_paid" && styles.statusPartial,
                paymentStatus === "unpaid" && styles.statusUnpaid,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  paymentStatus === "paid" && styles.statusDotPaid,
                  paymentStatus === "partially_paid" && styles.statusDotPartial,
                  paymentStatus === "unpaid" && styles.statusDotUnpaid,
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  paymentStatus === "paid" && styles.statusTextPaid,
                  paymentStatus === "partially_paid" &&
                    styles.statusTextPartial,
                  paymentStatus === "unpaid" && styles.statusTextUnpaid,
                ]}
              >
                {paymentStatus === "paid"
                  ? "PAID"
                  : paymentStatus === "partially_paid"
                    ? "PARTIALLY PAID"
                    : "UNPAID"}
              </Text>
            </View>
          </View>

          <View style={styles.statusMessage}>
            <Ionicons
              name={
                paymentStatus === "paid"
                  ? "checkmark-circle"
                  : paymentStatus === "partially_paid"
                    ? "time-outline"
                    : "alert-circle-outline"
              }
              size={22}
              color={
                paymentStatus === "paid"
                  ? colors.success
                  : paymentStatus === "partially_paid"
                    ? colors.warning
                    : colors.textMuted
              }
            />

            <Text style={styles.statusMessageText}>
              {paymentStatus === "paid"
                ? "The full amount is covered."
                : paymentStatus === "partially_paid"
                  ? `${formatCurrency(
                      balance,
                    )} will remain as the customer's balance.`
                  : "No payment has been entered yet."}
            </Text>
          </View>
        </AppCard>

        <View style={styles.actions}>
          <AppButton
            title="Back to Order"
            icon="arrow-back"
            variant="secondary"
            fullWidth={!isTablet}
            onPress={handleBackToOrder}
          />

          <AppButton
            title="Complete Job Order"
            icon="checkmark"
            fullWidth={!isTablet}
            disabled={paymentAmount <= 0}
            onPress={handleCompleteJobOrder}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function parseAmount(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    width: "100%",
    alignSelf: "center",
    padding: PAGE_PADDING,
    paddingBottom: spacing["4xl"],
  },

  amountCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.primaryLight,
  },

  amountLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    letterSpacing: 0.7,
  },

  amountValue: {
    marginTop: spacing.xs,
    ...typography.display,
    color: colors.primaryDark,
  },

  amountMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },

  amountMetaLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },

  amountMetaValue: {
    ...typography.small,
    color: colors.text,
  },

  discountValue: {
    ...typography.small,
    color: colors.danger,
  },

  paymentCard: {
    marginBottom: spacing.lg,
  },

  methodRow: {
    gap: spacing.sm,
  },

  methodRowTablet: {
    flexDirection: "row",
  },

  methodButton: {
    minHeight: 76,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surfaceSoft,
  },

  methodButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },

  gcashIcon: {
    backgroundColor: colors.accentLight,
  },

  methodIconActive: {
    backgroundColor: colors.surface,
  },

  methodInfo: {
    flex: 1,
  },

  methodTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  methodTitleActive: {
    color: colors.primaryDark,
  },

  methodDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  calculationBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surfaceSoft,
  },

  calculationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 34,
  },

  calculationLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },

  calculationValue: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  successValue: {
    color: colors.success,
  },

  calculationDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },

  changeLabel: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  changeValue: {
    ...typography.h3,
    color: colors.primaryDark,
  },

  statusCard: {
    marginBottom: spacing.lg,
  },

  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  statusLabel: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 0.7,
  },

  statusBadge: {
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: theme.radius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  statusPaid: {
    backgroundColor: colors.successLight,
  },

  statusPartial: {
    backgroundColor: colors.warningLight,
  },

  statusUnpaid: {
    backgroundColor: colors.surfaceSoft,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: theme.radius.full,
  },

  statusDotPaid: {
    backgroundColor: colors.success,
  },

  statusDotPartial: {
    backgroundColor: colors.warning,
  },

  statusDotUnpaid: {
    backgroundColor: colors.textMuted,
  },

  statusText: {
    ...typography.caption,
  },

  statusTextPaid: {
    color: colors.success,
  },

  statusTextPartial: {
    color: colors.warning,
  },

  statusTextUnpaid: {
    color: colors.textSecondary,
  },

  statusMessage: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  statusMessageText: {
    flex: 1,
    ...typography.small,
    color: colors.textSecondary,
  },

  actions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  invalidScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
  },

  invalidAction: {
    marginTop: spacing.lg,
  },
});
