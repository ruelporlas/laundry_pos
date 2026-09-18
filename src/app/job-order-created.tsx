import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import type { Customer } from "@/models/customer";
import type {
  JobOrder,
  JobOrderItem,
  Payment,
  PaymentInput,
  PaymentMethod,
} from "@/models/jobOrder";
import { getCustomerById } from "@/repositories/customerRepository";
import {
  addJobOrderPayment,
  getJobOrderById,
  getJobOrderItems,
  getJobOrderPayments,
} from "@/repositories/jobOrderRepository";

const PAGE_PADDING = 16;
const MAX_CONTENT_WIDTH = 720;

export default function JobOrderCreatedScreen() {
  const router = useRouter();

  const { width } = useWindowDimensions();

  const params = useLocalSearchParams<{
    id?: string;
  }>();

  const [jobOrder, setJobOrder] = useState<JobOrder | null>(null);
  const [items, setItems] = useState<JobOrderItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [error, setError] = useState("");

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);

  useEffect(() => {
    loadJobOrder();
  }, [params.id]);

  async function loadJobOrder() {
    if (!params.id) {
      setError("The Job Order could not be identified.");
      setLoading(false);
      return;
    }

    const id = Number(params.id);

    if (!Number.isInteger(id)) {
      setError("The Job Order ID is invalid.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [jobOrderData, itemData, paymentData] = await Promise.all([
        getJobOrderById(id),
        getJobOrderItems(id),
        getJobOrderPayments(id),
      ]);

      if (!jobOrderData) {
        throw new Error("The Job Order could not be found.");
      }

      setJobOrder(jobOrderData);
      setItems(itemData);
      setPayments(paymentData);

      const customerData = await getCustomerById(jobOrderData.customerId);

      setCustomer(customerData);
    } catch (err) {
      console.error("Failed to load Job Order:", err);

      setError(
        err instanceof Error ? err.message : "Unable to load the Job Order.",
      );
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return `₱${amount.toFixed(2)}`;
  }

  function getStatusLabel() {
    if (!jobOrder) {
      return "";
    }

    switch (jobOrder.paymentStatus) {
      case "paid":
        return "PAID";

      case "partially_paid":
        return "PARTIALLY PAID";

      case "unpaid":
        return "UNPAID";
    }
  }

  function getPaymentMethodLabel(method: PaymentMethod): string {
    switch (method) {
      case "cash":
        return "Cash";

      case "gcash":
        return "GCash";

      case "other":
        return "Other";
    }
  }

  function openPaymentModal() {
    if (!jobOrder || jobOrder.balance <= 0) {
      return;
    }

    setPaymentMethod("cash");
    setPaymentAmount(jobOrder.balance.toFixed(2));
    setCashReceived(jobOrder.balance.toFixed(2));
    setReferenceNumber("");
    setPaymentNote("");
    setPaymentModalVisible(true);
  }

  function closePaymentModal() {
    if (savingPayment) {
      return;
    }

    setPaymentModalVisible(false);
  }

  function handlePaymentAmountChange(value: string) {
    setPaymentAmount(value);

    if (paymentMethod === "cash") {
      setCashReceived(value);
    }
  }

  function handlePaymentMethodChange(method: PaymentMethod) {
    setPaymentMethod(method);

    if (method === "cash") {
      setCashReceived(paymentAmount);
    } else {
      setCashReceived("");
    }
  }

  async function handleSavePayment() {
    if (!jobOrder) {
      return;
    }

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid Payment", "Please enter a payment amount.");
      return;
    }

    if (amount > jobOrder.balance) {
      Alert.alert(
        "Invalid Payment",
        "The payment cannot be greater than the remaining balance.",
      );
      return;
    }

    const input: PaymentInput = {
      paymentMethod,
      amount,
      cashReceived: paymentMethod === "cash" ? Number(cashReceived) : undefined,
      referenceNumber:
        paymentMethod === "gcash" ? referenceNumber.trim() : undefined,
      paymentNote: paymentMethod === "other" ? paymentNote.trim() : undefined,
    };

    try {
      setSavingPayment(true);

      const result = await addJobOrderPayment(jobOrder.id, input);

      setJobOrder(result.jobOrder);
      setPayments((current) => [...current, result.payment]);

      setPaymentModalVisible(false);

      Alert.alert(
        "Payment Saved",
        result.jobOrder.paymentStatus === "paid"
          ? "The Job Order is now fully paid."
          : `Payment recorded. Remaining balance: ${formatCurrency(
              result.jobOrder.balance,
            )}.`,
      );
    } catch (err) {
      console.error("Failed to save payment:", err);

      Alert.alert(
        "Unable to Save Payment",
        err instanceof Error ? err.message : "Unable to save the payment.",
      );
    } finally {
      setSavingPayment(false);
    }
  }

  function handlePrintStub() {
    console.log("Print Claim Stub:", jobOrder?.jobOrderNumber);
  }

  function handleDone() {
    router.replace("/orders");
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />

        <Text style={styles.loadingText}>Loading Job Order...</Text>
      </View>
    );
  }

  if (error || !jobOrder) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.errorIcon}>
          <Ionicons
            name="alert-circle-outline"
            size={30}
            color={colors.danger}
          />
        </View>

        <Text style={styles.errorTitle}>Unable to load Job Order</Text>

        <Text style={styles.errorText}>
          {error || "The Job Order could not be loaded."}
        </Text>

        <AppButton
          title="Go to Orders"
          icon="receipt-outline"
          onPress={() => router.replace("/orders")}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <View
          style={[
            styles.heroInner,
            {
              maxWidth: MAX_CONTENT_WIDTH,
            },
          ]}
        >
          <View style={styles.heroIcon}>
            <Ionicons
              name={
                jobOrder.paymentStatus === "paid"
                  ? "checkmark-circle"
                  : "receipt"
              }
              size={30}
              color={
                jobOrder.paymentStatus === "paid"
                  ? colors.success
                  : colors.primary
              }
            />
          </View>

          <Text style={styles.heroTitle}>Job Order Details</Text>

          <Text style={styles.heroSubtitle}>{jobOrder.jobOrderNumber}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            maxWidth: contentWidth,
          },
        ]}
      >
        <AppCard padding={spacing.lg} style={styles.summaryCard}>
          <Text style={styles.jobOrderLabel}>JOB ORDER</Text>

          <Text style={styles.jobOrderNumber}>{jobOrder.jobOrderNumber}</Text>

          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                jobOrder.paymentStatus === "paid"
                  ? styles.statusDotPaid
                  : jobOrder.paymentStatus === "partially_paid"
                    ? styles.statusDotPartial
                    : styles.statusDotUnpaid,
              ]}
            />

            <Text
              style={[
                styles.statusText,
                jobOrder.paymentStatus === "paid"
                  ? styles.statusTextPaid
                  : jobOrder.paymentStatus === "partially_paid"
                    ? styles.statusTextPartial
                    : styles.statusTextUnpaid,
              ]}
            >
              {getStatusLabel()}
            </Text>
          </View>

          <View style={styles.customerBlock}>
            <Text style={styles.customerLabel}>CUSTOMER</Text>

            <Text style={styles.customerName}>
              {customer?.name || "Customer"}
            </Text>
          </View>

          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>TOTAL</Text>

            <Text style={styles.totalValue}>
              {formatCurrency(jobOrder.total)}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount Paid</Text>

            <Text style={styles.summaryValue}>
              {formatCurrency(jobOrder.amountPaid)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Balance</Text>

            <Text
              style={[
                styles.summaryValue,
                jobOrder.balance > 0 && styles.balanceValue,
              ]}
            >
              {formatCurrency(jobOrder.balance)}
            </Text>
          </View>
        </AppCard>

        <AppCard padding={spacing.lg}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="basket-outline"
                size={21}
                color={colors.primary}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Order Items</Text>

              <Text style={styles.sectionSubtitle}>
                Items included in this Job Order
              </Text>
            </View>
          </View>

          <View style={styles.itemList}>
            {items.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.orderItem,
                  index < items.length - 1 && styles.orderItemDivider,
                ]}
              >
                <View style={styles.orderItemMain}>
                  <Text style={styles.orderItemName}>{item.itemName}</Text>

                  <Text style={styles.orderItemQuantity}>
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </Text>
                </View>

                <Text style={styles.orderItemTotal}>
                  {formatCurrency(item.lineTotal)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.orderTotals}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>

              <Text style={styles.summaryValue}>
                {formatCurrency(jobOrder.subtotal)}
              </Text>
            </View>

            {jobOrder.discountAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>

                <Text style={styles.discountValue}>
                  -{formatCurrency(jobOrder.discountAmount)}
                </Text>
              </View>
            )}

            <View style={styles.totalDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.orderTotalLabel}>Total</Text>

              <Text style={styles.orderTotalValue}>
                {formatCurrency(jobOrder.total)}
              </Text>
            </View>
          </View>
        </AppCard>

        <AppCard padding={spacing.lg}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="card-outline" size={21} color={colors.primary} />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Payment History</Text>

              <Text style={styles.sectionSubtitle}>
                Payments recorded for this Job Order
              </Text>
            </View>
          </View>

          {payments.length === 0 ? (
            <View style={styles.emptyPayments}>
              <Ionicons
                name="wallet-outline"
                size={28}
                color={colors.textMuted}
              />

              <Text style={styles.emptyPaymentsText}>
                No payments have been recorded yet.
              </Text>
            </View>
          ) : (
            <View style={styles.paymentList}>
              {payments.map((payment, index) => (
                <View
                  key={payment.id}
                  style={[
                    styles.paymentRow,
                    index < payments.length - 1 && styles.paymentRowDivider,
                  ]}
                >
                  <View style={styles.paymentIcon}>
                    <Ionicons
                      name={
                        payment.paymentMethod === "cash"
                          ? "cash-outline"
                          : payment.paymentMethod === "gcash"
                            ? "phone-portrait-outline"
                            : "card-outline"
                      }
                      size={19}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.paymentMain}>
                    <Text style={styles.paymentMethod}>
                      {getPaymentMethodLabel(payment.paymentMethod)}
                    </Text>

                    {payment.referenceNumber && (
                      <Text style={styles.paymentMeta}>
                        Ref: {payment.referenceNumber}
                      </Text>
                    )}

                    {payment.paymentNote && (
                      <Text style={styles.paymentMeta}>
                        {payment.paymentNote}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.paymentAmount}>
                    {formatCurrency(payment.amount)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {jobOrder.balance > 0 && !jobOrder.isVoided && (
            <View style={styles.paymentAction}>
              <AppButton
                title={
                  jobOrder.paymentStatus === "unpaid"
                    ? "Make Payment"
                    : "Pay Remaining Balance"
                }
                icon="card-outline"
                fullWidth
                onPress={openPaymentModal}
              />
            </View>
          )}
        </AppCard>

        <AppCard padding={spacing.lg} style={styles.stubCard}>
          <View style={styles.stubHeader}>
            <View style={styles.stubIcon}>
              <Ionicons
                name="ticket-outline"
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.stubHeaderText}>
              <Text style={styles.stubTitle}>Acknowledgment / Claim Stub</Text>

              <Text style={styles.stubSubtitle}>
                Give this to the customer for claiming
              </Text>
            </View>
          </View>

          <View style={styles.stubPreview}>
            <Text style={styles.stubShopTitle}>LAUNDRY SHOP</Text>

            <Text style={styles.stubDocumentTitle}>LAUNDRY ACKNOWLEDGMENT</Text>

            <View style={styles.stubDivider} />

            <View style={styles.stubRow}>
              <Text style={styles.stubLabel}>Job Order</Text>

              <Text style={styles.stubValue}>{jobOrder.jobOrderNumber}</Text>
            </View>

            <View style={styles.stubRow}>
              <Text style={styles.stubLabel}>Customer</Text>

              <Text style={styles.stubValue}>
                {customer?.name || "Customer"}
              </Text>
            </View>

            <View style={styles.stubDivider} />

            {items.map((item) => (
              <View key={item.id} style={styles.stubItem}>
                <View style={styles.stubItemMain}>
                  <Text style={styles.stubItemName}>{item.itemName}</Text>

                  <Text style={styles.stubItemQuantity}>
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </Text>
                </View>

                <Text style={styles.stubItemTotal}>
                  {formatCurrency(item.lineTotal)}
                </Text>
              </View>
            ))}

            <View style={styles.stubDivider} />

            <View style={styles.stubTotalRow}>
              <Text style={styles.stubTotalLabel}>TOTAL</Text>

              <Text style={styles.stubTotalValue}>
                {formatCurrency(jobOrder.total)}
              </Text>
            </View>

            <View style={styles.stubStatus}>
              <Text style={styles.stubStatusLabel}>PAYMENT STATUS</Text>

              <Text style={styles.stubStatusValue}>{getStatusLabel()}</Text>
            </View>

            <Text style={styles.stubFooter}>
              Please present this stub when claiming your laundry.
            </Text>
          </View>

          <AppButton
            title="Print Claim Stub"
            icon="print-outline"
            variant="secondary"
            fullWidth
            onPress={handlePrintStub}
          />
        </AppCard>

        <AppButton
          title="Done"
          icon="checkmark"
          fullWidth
          onPress={handleDone}
        />
      </ScrollView>

      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closePaymentModal}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closePaymentModal} />

          <View style={styles.paymentModal}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Make Payment</Text>

                <Text style={styles.modalSubtitle}>
                  Balance: {formatCurrency(jobOrder.balance)}
                </Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={closePaymentModal}
                disabled={savingPayment}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalContent}
            >
              <Text style={styles.inputLabel}>Payment Amount</Text>

              <View style={styles.amountInputWrapper}>
                <Text style={styles.currencyPrefix}>₱</Text>

                <TextInput
                  value={paymentAmount}
                  onChangeText={handlePaymentAmountChange}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  style={styles.amountInput}
                />
              </View>

              <Text style={styles.inputHint}>
                Maximum payment: {formatCurrency(jobOrder.balance)}
              </Text>

              <Text style={styles.inputLabel}>Payment Method</Text>

              <View style={styles.methodRow}>
                {[
                  {
                    method: "cash" as PaymentMethod,
                    label: "Cash",
                    icon: "cash-outline" as const,
                  },
                  {
                    method: "gcash" as PaymentMethod,
                    label: "GCash",
                    icon: "phone-portrait-outline" as const,
                  },
                  {
                    method: "other" as PaymentMethod,
                    label: "Other",
                    icon: "card-outline" as const,
                  },
                ].map((option) => {
                  const selected = paymentMethod === option.method;

                  return (
                    <Pressable
                      key={option.method}
                      style={[
                        styles.methodOption,
                        selected && styles.methodOptionSelected,
                      ]}
                      onPress={() => handlePaymentMethodChange(option.method)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={21}
                        color={selected ? colors.primary : colors.textSecondary}
                      />

                      <Text
                        style={[
                          styles.methodLabel,
                          selected && styles.methodLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {paymentMethod === "cash" && (
                <>
                  <Text style={styles.inputLabel}>Cash Received</Text>

                  <TextInput
                    value={cashReceived}
                    onChangeText={setCashReceived}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    style={styles.textInput}
                  />

                  {Number(cashReceived) >= Number(paymentAmount) &&
                    Number(paymentAmount) > 0 && (
                      <View style={styles.changePreview}>
                        <Text style={styles.changeLabel}>Change</Text>

                        <Text style={styles.changeValue}>
                          {formatCurrency(
                            Math.max(
                              Number(cashReceived) - Number(paymentAmount),
                              0,
                            ),
                          )}
                        </Text>
                      </View>
                    )}
                </>
              )}

              {paymentMethod === "gcash" && (
                <>
                  <Text style={styles.inputLabel}>
                    Reference Number
                    <Text style={styles.optionalLabel}> (optional)</Text>
                  </Text>

                  <TextInput
                    value={referenceNumber}
                    onChangeText={setReferenceNumber}
                    placeholder="Enter GCash reference"
                    placeholderTextColor={colors.textMuted}
                    style={styles.textInput}
                    autoCapitalize="characters"
                  />
                </>
              )}

              {paymentMethod === "other" && (
                <>
                  <Text style={styles.inputLabel}>Payment Details</Text>

                  <TextInput
                    value={paymentNote}
                    onChangeText={setPaymentNote}
                    placeholder="e.g. Maya, bank transfer, credit card"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.textInput, styles.textArea]}
                    multiline
                    textAlignVertical="top"
                  />
                </>
              )}

              <View style={styles.modalBalanceCard}>
                <View>
                  <Text style={styles.modalBalanceLabel}>
                    Remaining Balance
                  </Text>

                  <Text style={styles.modalBalanceValue}>
                    {formatCurrency(
                      Math.max(
                        jobOrder.balance - Number(paymentAmount || 0),
                        0,
                      ),
                    )}
                  </Text>
                </View>

                <Ionicons
                  name="wallet-outline"
                  size={25}
                  color={colors.primary}
                />
              </View>

              <AppButton
                title={savingPayment ? "Saving Payment..." : "Save Payment"}
                icon="checkmark-circle-outline"
                fullWidth
                onPress={handleSavePayment}
                disabled={savingPayment}
              />

              <View style={styles.modalBottomSpace} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  hero: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 54,
    paddingBottom: 20,
  },

  heroInner: {
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.full,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
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
    padding: PAGE_PADDING,
    paddingBottom: 40,
    gap: spacing.lg,
  },

  summaryCard: {
    alignItems: "center",
  },

  jobOrderLabel: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 1,
  },

  jobOrderNumber: {
    marginTop: spacing.xs,
    ...typography.h1,
    color: colors.text,
  },

  statusBadge: {
    marginTop: spacing.md,
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: theme.radius.full,
    backgroundColor: colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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

  customerBlock: {
    width: "100%",
    alignItems: "center",
    marginTop: spacing.lg,
  },

  customerLabel: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },

  customerName: {
    marginTop: 2,
    ...typography.bodyMedium,
    color: colors.text,
  },

  totalBlock: {
    marginTop: spacing.lg,
    alignItems: "center",
  },

  totalLabel: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },

  totalValue: {
    marginTop: 2,
    ...typography.display,
    color: colors.primaryDark,
  },

  summaryDivider: {
    width: "100%",
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  summaryRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 32,
  },

  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },

  summaryValue: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  balanceValue: {
    color: colors.warning,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  itemList: {
    width: "100%",
  },

  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },

  orderItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  orderItemMain: {
    flex: 1,
  },

  orderItemName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  orderItemQuantity: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  orderItemTotal: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  orderTotals: {
    marginTop: spacing.md,
  },

  totalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  orderTotalLabel: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  orderTotalValue: {
    ...typography.h3,
    color: colors.primaryDark,
  },

  discountValue: {
    ...typography.bodyMedium,
    color: colors.success,
  },

  paymentList: {
    width: "100%",
  },

  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },

  paymentRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  paymentIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  paymentMain: {
    flex: 1,
  },

  paymentMethod: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  paymentMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },

  paymentAmount: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  emptyPayments: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },

  emptyPaymentsText: {
    marginTop: spacing.sm,
    ...typography.small,
    color: colors.textMuted,
    textAlign: "center",
  },

  paymentAction: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  stubCard: {
    width: "100%",
  },

  stubHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },

  stubIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },

  stubHeaderText: {
    flex: 1,
  },

  stubTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  stubSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  stubPreview: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  stubShopTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
  },

  stubDocumentTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },

  stubDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  stubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginVertical: 3,
  },

  stubLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },

  stubValue: {
    flex: 1,
    ...typography.small,
    color: colors.text,
    textAlign: "right",
  },

  stubItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginVertical: 4,
  },

  stubItemMain: {
    flex: 1,
  },

  stubItemName: {
    ...typography.small,
    color: colors.text,
  },

  stubItemQuantity: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 1,
  },

  stubItemTotal: {
    ...typography.small,
    color: colors.text,
  },

  stubTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  stubTotalLabel: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  stubTotalValue: {
    ...typography.h3,
    color: colors.primaryDark,
  },

  stubStatus: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "center",
  },

  stubStatusLabel: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },

  stubStatusValue: {
    marginTop: 2,
    ...typography.bodyMedium,
    color: colors.text,
  },

  stubFooter: {
    marginTop: spacing.lg,
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },

  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },

  paymentModal: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: "center",
    marginVertical: spacing.sm,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  modalTitle: {
    ...typography.h2,
    color: colors.text,
  },

  modalSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  modalContent: {
    padding: spacing.lg,
    paddingBottom: 30,
  },

  inputLabel: {
    ...typography.bodyMedium,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },

  amountInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },

  currencyPrefix: {
    ...typography.h3,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },

  amountInput: {
    flex: 1,
    ...typography.h3,
    color: colors.text,
    paddingVertical: 0,
  },

  inputHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  methodRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  methodOption: {
    flex: 1,
    minHeight: 76,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },

  methodOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  methodLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 5,
  },

  methodLabelSelected: {
    color: colors.primaryDark,
  },

  textInput: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },

  textArea: {
    minHeight: 90,
    paddingTop: spacing.md,
  },

  optionalLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },

  changePreview: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 46,
    borderRadius: theme.radius.md,
    backgroundColor: colors.successLight,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  changeLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },

  changeValue: {
    ...typography.bodyMedium,
    color: colors.success,
  },

  modalBalanceCard: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modalBalanceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  modalBalanceValue: {
    marginTop: 2,
    ...typography.h3,
    color: colors.primaryDark,
  },

  modalBottomSpace: {
    height: spacing.md,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing["2xl"],
  },

  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  errorIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.dangerLight,
    justifyContent: "center",
    alignItems: "center",
  },

  errorTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },

  errorText: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 360,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
});
