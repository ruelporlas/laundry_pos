import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
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
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import type { AuditAction, AuditChange, AuditLog } from "@/models/auditLog";
import type { Customer } from "@/models/customer";
import type {
  JobOrder,
  JobOrderItem,
  Payment,
  PaymentInput,
  PaymentMethod,
} from "@/models/jobOrder";
import type { User } from "@/models/user";
import { getAuditLogsByEntity } from "@/repositories/auditLogRepository";
import { getCustomerById } from "@/repositories/customerRepository";
import {
  addJobOrderPayment,
  getJobOrderById,
  getJobOrderItems,
  getJobOrderPayments,
  voidJobOrder,
} from "@/repositories/jobOrderRepository";
import { getUserById } from "@/repositories/userRepository";

const MAX_CONTENT_WIDTH = 720;

export default function JobOrderCreatedScreen() {
  const router = useRouter();

  const { user, isAdmin } = useAuth();

  const { width } = useWindowDimensions();

  const params = useLocalSearchParams<{
    id?: string;
  }>();

  const [jobOrder, setJobOrder] = useState<JobOrder | null>(null);
  const [items, setItems] = useState<JobOrderItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [createdByUser, setCreatedByUser] = useState<User | null>(null);
  const [voidedByUser, setVoidedByUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [error, setError] = useState("");

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [activityModalVisible, setActivityModalVisible] = useState(false);

  const [selectedActivity, setSelectedActivity] = useState<AuditLog | null>(
    null,
  );

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const [voidReason, setVoidReason] = useState("");

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

      const [jobOrderData, itemData, paymentData, activityData] =
        await Promise.all([
          getJobOrderById(id),
          getJobOrderItems(id),
          getJobOrderPayments(id),
          getAuditLogsByEntity("job_order", id),
        ]);

      if (!jobOrderData) {
        throw new Error("The Job Order could not be found.");
      }

      setJobOrder(jobOrderData);
      setItems(itemData);
      setPayments(paymentData);
      setActivities(activityData);

      const customerData = await getCustomerById(jobOrderData.customerId);

      setCustomer(customerData);

      if (jobOrderData.createdBy !== null) {
        const creatorData = await getUserById(jobOrderData.createdBy);

        setCreatedByUser(creatorData);
      } else {
        setCreatedByUser(null);
      }

      if (jobOrderData.voidedBy !== null) {
        const voiderData = await getUserById(jobOrderData.voidedBy);

        setVoidedByUser(voiderData);
      } else {
        setVoidedByUser(null);
      }
    } catch (err) {
      console.error("Failed to load Job Order:", err);

      setError(
        err instanceof Error ? err.message : "Unable to load the Job Order.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshActivities() {
    if (!jobOrder) {
      return;
    }

    try {
      const activityData = await getAuditLogsByEntity("job_order", jobOrder.id);

      setActivities(activityData);
    } catch (err) {
      console.error("Failed to refresh Job Order activities:", err);
    }
  }

  function formatCurrency(amount: number): string {
    return `₱${amount.toFixed(2)}`;
  }

  function formatDateTime(value: string | null): string {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getStatusLabel() {
    if (!jobOrder) {
      return "";
    }

    if (jobOrder.isVoided) {
      return "VOIDED";
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

  function getActivityConfig(action: AuditAction): {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    backgroundColor: string;
  } {
    switch (action) {
      case "created":
        return {
          label: "Created",
          icon: "add-circle-outline",
          color: colors.success,
          backgroundColor: colors.successLight,
        };

      case "updated":
        return {
          label: "Updated",
          icon: "create-outline",
          color: colors.primary,
          backgroundColor: colors.primaryLight,
        };

      case "activated":
        return {
          label: "Activated",
          icon: "checkmark-circle-outline",
          color: colors.success,
          backgroundColor: colors.successLight,
        };

      case "deactivated":
        return {
          label: "Deactivated",
          icon: "pause-circle-outline",
          color: colors.warning,
          backgroundColor: colors.warningLight,
        };

      case "voided":
        return {
          label: "Voided",
          icon: "close-circle-outline",
          color: colors.danger,
          backgroundColor: colors.dangerLight,
        };

      case "deleted":
        return {
          label: "Deleted",
          icon: "trash-outline",
          color: colors.danger,
          backgroundColor: colors.dangerLight,
        };

      case "item_removed":
        return {
          label: "Item Removed",
          icon: "trash-outline",
          color: colors.danger,
          backgroundColor: colors.dangerLight,
        };

      case "login":
        return {
          label: "Logged In",
          icon: "log-in-outline",
          color: colors.success,
          backgroundColor: colors.successLight,
        };

      case "logout":
        return {
          label: "Logged Out",
          icon: "log-out-outline",
          color: colors.textSecondary,
          backgroundColor: colors.surfaceSoft,
        };

      case "password_changed":
        return {
          label: "Password Changed",
          icon: "key-outline",
          color: colors.primary,
          backgroundColor: colors.primaryLight,
        };

      case "password_reset":
        return {
          label: "Password Reset",
          icon: "key-outline",
          color: colors.warning,
          backgroundColor: colors.warningLight,
        };

      case "payment_added":
        return {
          label: "Payment Added",
          icon: "card-outline",
          color: colors.success,
          backgroundColor: colors.successLight,
        };

      case "other":
      default:
        return {
          label: "Activity",
          icon: "information-circle-outline",
          color: colors.textSecondary,
          backgroundColor: colors.surfaceSoft,
        };
    }
  }

  function getActivitySummary(activity: AuditLog): string {
    if (activity.action === "item_removed") {
      const removedItems = getRemovedItems(activity);

      if (removedItems.length === 1) {
        return "1 item removed";
      }

      if (removedItems.length > 1) {
        return `${removedItems.length} items removed`;
      }

      return "Items were removed";
    }

    if (activity.action === "payment_added") {
      const amount = getPaymentAmount(activity);

      if (amount !== null) {
        return `Payment recorded: ${formatCurrency(amount)}`;
      }

      return "A payment was recorded";
    }

    if (activity.action === "voided") {
      return "Transaction was voided";
    }

    if (activity.action === "created") {
      return "Job Order created";
    }

    if (activity.action === "updated") {
      return "Job Order updated";
    }

    return "Activity recorded";
  }

  function getPaymentAmount(activity: AuditLog): number | null {
    const changes = activity.changes;

    const possibleValues = [
      changes.amount,
      changes.paymentAmount,
      changes.paidAmount,
    ];

    for (const value of possibleValues) {
      if (typeof value === "number") {
        return value;
      }

      if (typeof value === "string") {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return null;
  }

  function getRemovedItems(activity: AuditLog): RemovedItem[] {
    const changes = activity.changes;

    const removedItems = changes.removedItems;

    if (Array.isArray(removedItems)) {
      return removedItems.map((item) => {
        const record =
          item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {};

        const quantity =
          typeof record.quantity === "number" ? record.quantity : 0;

        const unitPrice =
          typeof record.unitPrice === "number" ? record.unitPrice : 0;

        const lineTotal =
          typeof record.lineTotal === "number"
            ? record.lineTotal
            : quantity * unitPrice;

        return {
          itemName:
            typeof record.itemName === "string"
              ? record.itemName
              : typeof record.name === "string"
                ? record.name
                : "Item",
          itemType:
            record.itemType === "service" ||
            record.itemType === "bundle" ||
            record.itemType === "product"
              ? record.itemType
              : undefined,
          quantity,
          unitPrice,
          lineTotal,
        };
      });
    }

    const itemsChange = changes.items;

    if (!itemsChange || typeof itemsChange !== "object") {
      return [];
    }

    const fromValue = (itemsChange as AuditChange).from;

    if (typeof fromValue !== "string" || !fromValue.trim()) {
      return [];
    }

    return fromValue
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(
          /^(.*?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*@\s*₱?\s*([\d,]+(?:\.\d+)?)$/,
        );

        if (!match) {
          return {
            itemName: line,
            itemType: undefined,
            quantity: 1,
            unitPrice: 0,
            lineTotal: 0,
          };
        }

        const [, itemName, quantityText, unitPriceText] = match;

        const quantity = Number(quantityText);
        const unitPrice = Number(unitPriceText.replace(/,/g, ""));

        return {
          itemName: itemName.trim(),
          itemType: undefined,
          quantity,
          unitPrice,
          lineTotal: quantity * unitPrice,
        };
      });
  }

  function formatActivityChangeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "—";
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (typeof value === "number") {
      return value.toLocaleString();
    }

    if (typeof value === "string") {
      return value;
    }

    return "Details changed";
  }

  function formatFieldName(value: string): string {
    return value
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, (character) => character.toUpperCase());
  }

  function openActivity(activity: AuditLog) {
    setSelectedActivity(activity);
    setActivityModalVisible(true);
  }

  function closeActivityModal() {
    setActivityModalVisible(false);
    setSelectedActivity(null);
  }

  function openPaymentModal() {
    if (!jobOrder || jobOrder.balance <= 0 || jobOrder.isVoided) {
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

    if (jobOrder.isVoided) {
      Alert.alert(
        "Payment Not Allowed",
        "A voided Job Order cannot receive a payment.",
      );
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

      await refreshActivities();

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

  function openVoidModal() {
    if (!jobOrder || !isAdmin || jobOrder.isVoided || voiding) {
      return;
    }

    setVoidReason("");
    setVoidModalVisible(true);
  }

  function closeVoidModal() {
    if (voiding) {
      return;
    }

    setVoidModalVisible(false);
  }

  async function handleVoidJobOrder() {
    if (!jobOrder) {
      return;
    }

    if (!isAdmin || !user) {
      Alert.alert(
        "Authorization Required",
        "Only an administrator can void a Job Order.",
      );
      return;
    }

    const cleanReason = voidReason.trim();

    if (!cleanReason) {
      Alert.alert(
        "Void Reason Required",
        "Please enter a reason for voiding this Job Order.",
      );
      return;
    }

    try {
      setVoiding(true);

      const result = await voidJobOrder(jobOrder.id, user.id, cleanReason);

      setJobOrder(result);

      if (result.voidedBy !== null) {
        const voiderData = await getUserById(result.voidedBy);
        setVoidedByUser(voiderData);
      }

      setVoidModalVisible(false);
      setVoidReason("");

      await refreshActivities();

      Alert.alert(
        "Job Order Voided",
        `${result.jobOrderNumber} has been voided successfully.`,
      );
    } catch (err) {
      console.error("Failed to void Job Order:", err);

      Alert.alert(
        "Unable to Void Job Order",
        err instanceof Error ? err.message : "Unable to void the Job Order.",
      );
    } finally {
      setVoiding(false);
    }
  }

  function handlePrintStub() {
    console.log("Print Claim Stub:", jobOrder?.jobOrderNumber);
  }

  function handleDone() {
    router.replace("/orders");
  }

  if (loading) {
    return <LoadingState message="Loading Job Order..." />;
  }

  if (error || !jobOrder) {
    return (
      <View style={styles.errorScreen}>
        <ErrorState
          title="Unable to load Job Order"
          message={error || "The Job Order could not be loaded."}
        />

        <View style={styles.errorAction}>
          <AppButton
            title="Go to Orders"
            icon="receipt-outline"
            onPress={() => router.replace("/orders")}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <PageHero
        icon={
          jobOrder.isVoided
            ? "close-circle"
            : jobOrder.paymentStatus === "paid"
              ? "checkmark-circle"
              : "receipt"
        }
        title="Job Order Details"
        subtitle={jobOrder.jobOrderNumber}
      />

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

          <View
            style={[
              styles.statusBadge,
              jobOrder.isVoided && styles.statusBadgeVoided,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                jobOrder.isVoided
                  ? styles.statusDotVoided
                  : jobOrder.paymentStatus === "paid"
                    ? styles.statusDotPaid
                    : jobOrder.paymentStatus === "partially_paid"
                      ? styles.statusDotPartial
                      : styles.statusDotUnpaid,
              ]}
            />

            <Text
              style={[
                styles.statusText,
                jobOrder.isVoided
                  ? styles.statusTextVoided
                  : jobOrder.paymentStatus === "paid"
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

          <View style={styles.creatorBlock}>
            <Text style={styles.customerLabel}>CREATED BY</Text>

            <Text style={styles.customerName}>
              {createdByUser?.fullName || "Unknown User"}
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

        {jobOrder.isVoided && (
          <AppCard padding={spacing.lg} style={styles.voidedCard}>
            <View style={styles.voidedHeader}>
              <View style={styles.voidedIcon}>
                <Ionicons
                  name="close-circle-outline"
                  size={23}
                  color={colors.danger}
                />
              </View>

              <View style={styles.voidedHeaderText}>
                <Text style={styles.voidedTitle}>Transaction Voided</Text>

                <Text style={styles.voidedSubtitle}>
                  This transaction is retained for historical records.
                </Text>
              </View>
            </View>

            <View style={styles.voidedDivider} />

            <View style={styles.voidedInfoRow}>
              <Text style={styles.voidedInfoLabel}>VOIDED BY</Text>

              <Text style={styles.voidedInfoValue}>
                {voidedByUser?.fullName || "Unknown User"}
              </Text>
            </View>

            <View style={styles.voidedInfoRow}>
              <Text style={styles.voidedInfoLabel}>VOIDED AT</Text>

              <Text style={styles.voidedInfoValue}>
                {formatDateTime(jobOrder.voidedAt)}
              </Text>
            </View>

            <View style={styles.voidReasonBlock}>
              <Text style={styles.voidedInfoLabel}>REASON</Text>

              <Text style={styles.voidReasonText}>
                {jobOrder.voidReason || "No reason recorded."}
              </Text>
            </View>
          </AppCard>
        )}

        <AppCard padding={spacing.lg}>
          <SectionHeader
            icon="basket-outline"
            title="Order Items"
            subtitle="Items included in this Job Order"
          />

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
          <SectionHeader
            icon="card-outline"
            title="Payment History"
            subtitle="Payments recorded for this Job Order"
          />

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

        <Pressable
          style={({ pressed }) => [
            styles.activityHistoryLink,
            pressed && styles.activityHistoryLinkPressed,
          ]}
          onPress={() => {
            if (activities.length > 0) {
              openActivity(activities[0]);
            }
          }}
        >
          <View style={styles.activityHistoryLinkIcon}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
          </View>

          <View style={styles.activityHistoryLinkContent}>
            <Text style={styles.activityHistoryLinkTitle}>
              See Activity history
            </Text>

            <Text style={styles.activityHistoryLinkSubtitle}>
              {activities.length === 0
                ? "No activity recorded"
                : `${activities.length} ${
                    activities.length === 1 ? "activity" : "activities"
                  }`}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        {isAdmin && !jobOrder.isVoided && (
          <AppCard padding={spacing.lg} style={styles.transactionActionCard}>
            <View style={styles.transactionActionHeader}>
              <View style={styles.transactionActionHeaderText}>
                <Text style={styles.transactionActionTitle}>
                  Transaction Actions
                </Text>

                <Text style={styles.transactionActionSubtitle}>
                  Administrative action for correcting a transaction.
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.voidButton,
                pressed && styles.voidButtonPressed,
                voiding && styles.voidButtonDisabled,
              ]}
              onPress={openVoidModal}
              disabled={voiding}
            >
              <Ionicons
                name="close-circle-outline"
                size={20}
                color={colors.danger}
              />

              <Text style={styles.voidButtonText}>Void Transaction</Text>
            </Pressable>
          </AppCard>
        )}

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

              <Text
                style={[
                  styles.stubStatusValue,
                  jobOrder.isVoided && styles.stubStatusValueVoided,
                ]}
              >
                {getStatusLabel()}
              </Text>
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
        visible={activityModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeActivityModal}
      >
        <View style={styles.activityModalContainer}>
          <Pressable
            style={styles.activityModalBackdrop}
            onPress={closeActivityModal}
          />

          <View style={styles.activityModal}>
            <View style={styles.modalHandle} />

            <View style={styles.activityModalHeader}>
              <View style={styles.activityModalHeaderText}>
                <Text style={styles.activityModalTitle}>
                  Job Order Activity
                </Text>

                <Text style={styles.activityModalSubtitle}>
                  {jobOrder.jobOrderNumber}
                </Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={closeActivityModal}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {selectedActivity ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.activityModalContent}
              >
                <View style={styles.activityDetailHeader}>
                  <View
                    style={[
                      styles.activityDetailIcon,
                      {
                        backgroundColor: getActivityConfig(
                          selectedActivity.action,
                        ).backgroundColor,
                      },
                    ]}
                  >
                    <Ionicons
                      name={getActivityConfig(selectedActivity.action).icon}
                      size={24}
                      color={getActivityConfig(selectedActivity.action).color}
                    />
                  </View>

                  <View style={styles.activityDetailHeaderText}>
                    <Text style={styles.activityDetailTitle}>
                      {getActivityConfig(selectedActivity.action).label}
                    </Text>

                    <Text style={styles.activityDetailDate}>
                      {formatDateTime(selectedActivity.createdAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.activityUserRow}>
                  <Ionicons
                    name="person-outline"
                    size={17}
                    color={colors.textMuted}
                  />

                  <Text style={styles.activityUserText}>
                    {selectedActivity.userName}
                  </Text>
                </View>

                {selectedActivity.action === "item_removed" ? (
                  <RemovedItemsSection
                    items={getRemovedItems(selectedActivity)}
                    formatCurrency={formatCurrency}
                  />
                ) : (
                  <ActivityChangesSection
                    changes={selectedActivity.changes}
                    formatValue={formatActivityChangeValue}
                    formatFieldName={formatFieldName}
                  />
                )}

                <View style={styles.activityModalBottomSpace} />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

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

      <Modal
        visible={voidModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeVoidModal}
      >
        <KeyboardAvoidingView
          style={styles.voidModalContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={styles.voidModalBackdrop}
            onPress={closeVoidModal}
          />

          <View style={styles.voidModal}>
            <View style={styles.voidModalIcon}>
              <Ionicons
                name="warning-outline"
                size={28}
                color={colors.danger}
              />
            </View>

            <Text style={styles.voidModalTitle}>Void Job Order?</Text>

            <Text style={styles.voidModalSubtitle}>
              {jobOrder.jobOrderNumber} will be marked as voided and will no
              longer accept payments.
            </Text>

            <View style={styles.voidModalWarning}>
              <Ionicons
                name="information-circle-outline"
                size={19}
                color={colors.danger}
              />

              <Text style={styles.voidModalWarningText}>
                This action cannot be undone. The transaction will remain in the
                records for audit purposes.
              </Text>
            </View>

            <Text style={styles.voidReasonLabel}>Reason for Voiding</Text>

            <TextInput
              value={voidReason}
              onChangeText={setVoidReason}
              placeholder="Enter the reason for voiding this transaction"
              placeholderTextColor={colors.textMuted}
              style={[styles.textInput, styles.voidReasonInput]}
              multiline
              textAlignVertical="top"
              editable={!voiding}
            />

            <View style={styles.voidModalActions}>
              <Pressable
                style={styles.voidCancelButton}
                onPress={closeVoidModal}
                disabled={voiding}
              >
                <Text style={styles.voidCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.voidConfirmButton,
                  pressed && styles.voidConfirmButtonPressed,
                  voiding && styles.voidConfirmButtonDisabled,
                ]}
                onPress={handleVoidJobOrder}
                disabled={voiding}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={19}
                  color={colors.surface}
                />

                <Text style={styles.voidConfirmText}>
                  {voiding ? "Voiding..." : "Void Transaction"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

type RemovedActivityItem = {
  itemName: string;
  itemType: string;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
};

function RemovedItemsSection({
  items,
  formatCurrency,
}: {
  items: RemovedItem[];
  formatCurrency: (amount: number) => string;
}) {
  return (
    <View style={styles.activityChangesContainer}>
      <Text style={styles.activityChangesTitle}>Removed Items</Text>

      {items.length === 0 ? (
        <Text style={styles.activityChangesEmpty}>
          No removed item details are available.
        </Text>
      ) : (
        <View style={styles.removedItemsList}>
          {items.map((item, index) => (
            <View
              key={`${item.itemName}-${index}`}
              style={[
                styles.removedItem,
                index < items.length - 1 && styles.removedItemDivider,
              ]}
            >
              <View style={styles.removedItemMain}>
                <Text style={styles.removedItemName}>{item.itemName}</Text>

                {item.itemType ? (
                  <Text style={styles.removedItemType}>
                    {item.itemType === "service"
                      ? "Service"
                      : item.itemType === "bundle"
                        ? "Bundle"
                        : "Product"}
                  </Text>
                ) : null}

                <Text style={styles.removedItemQuantity}>
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </Text>
              </View>

              {item.lineTotal > 0 ? (
                <Text style={styles.removedItemTotal}>
                  {formatCurrency(item.lineTotal)}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

type RemovedItem = {
  itemName: string;
  itemType?: "product" | "service" | "bundle";
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

function ActivityChangesSection({
  changes,
  formatValue,
  formatFieldName,
}: {
  changes: Record<string, AuditChange>;
  formatValue: (value: unknown) => string;
  formatFieldName: (value: string) => string;
}) {
  const entries = Object.entries(changes);

  return (
    <View style={styles.activityChangesContainer}>
      <Text style={styles.activityChangesTitle}>Details</Text>

      {entries.length === 0 ? (
        <Text style={styles.activityEmptyDetails}>
          No additional details were recorded.
        </Text>
      ) : (
        <View style={styles.activityChangesList}>
          {entries.map(([field, change]) => (
            <View key={field} style={styles.activityChangeRow}>
              <Text style={styles.activityChangeField}>
                {formatFieldName(field)}
              </Text>

              <View style={styles.activityChangeValues}>
                <Text style={styles.activityChangeFrom}>
                  {formatValue(change.from)}
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={15}
                  color={colors.textMuted}
                />

                <Text style={styles.activityChangeTo}>
                  {formatValue(change.to)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    width: "100%",
    alignSelf: "center",
    padding: PAGE_PADDING,
    paddingBottom: spacing["4xl"],
    gap: spacing.lg,
  },
  activityHistoryLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.primaryLight,
  },

  activityHistoryLinkPressed: {
    opacity: 0.75,
  },

  activityHistoryLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    marginRight: spacing.sm,
  },

  activityHistoryLinkContent: {
    flex: 1,
  },

  activityHistoryLinkTitle: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
  },

  activityHistoryLinkSubtitle: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  activityChangesEmpty: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.sm,
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
    gap: spacing.xs,
  },

  statusBadgeVoided: {
    backgroundColor: colors.dangerLight,
  },

  statusDot: {
    width: 8,
    height: 8,
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

  statusDotVoided: {
    backgroundColor: colors.danger,
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

  statusTextVoided: {
    color: colors.danger,
  },

  customerBlock: {
    width: "100%",
    alignItems: "center",
    marginTop: spacing.lg,
  },

  creatorBlock: {
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

  voidedCard: {
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },

  voidedHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  voidedIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },

  voidedHeaderText: {
    flex: 1,
  },

  voidedTitle: {
    ...typography.bodyMedium,
    color: colors.danger,
  },

  voidedSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  voidedDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  voidedInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  voidedInfoLabel: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 0.7,
  },

  voidedInfoValue: {
    flex: 1,
    ...typography.small,
    color: colors.text,
    textAlign: "right",
  },

  voidReasonBlock: {
    marginTop: spacing.md,
  },

  voidReasonText: {
    marginTop: spacing.xs,
    ...typography.small,
    color: colors.text,
    lineHeight: 20,
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
    borderRadius: theme.radius.md,
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

  emptyActivities: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },

  emptyActivitiesText: {
    marginTop: spacing.sm,
    ...typography.small,
    color: colors.textMuted,
    textAlign: "center",
  },

  activityList: {
    width: "100%",
  },

  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },

  activityRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  activityRowPressed: {
    opacity: 0.65,
  },

  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },

  activityMain: {
    flex: 1,
  },

  activityTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  activitySummary: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 1,
  },

  activityMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
  },

  transactionActionCard: {
    borderWidth: 1,
    borderColor: colors.border,
  },

  transactionActionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  transactionActionIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },

  transactionActionHeaderText: {
    flex: 1,
  },

  transactionActionTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  transactionActionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  voidWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.dangerLight,
  },

  voidWarningText: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  voidButton: {
    minHeight: 50,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },

  voidButtonPressed: {
    opacity: 0.75,
  },

  voidButtonDisabled: {
    opacity: 0.5,
  },

  voidButtonText: {
    ...typography.bodyMedium,
    color: colors.danger,
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
    borderRadius: theme.radius.md,
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

  stubStatusValueVoided: {
    color: colors.danger,
  },

  stubFooter: {
    marginTop: spacing.lg,
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },

  activityModalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },

  activityModalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },

  activityModal: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: spacing.sm,
  },

  activityModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  activityModalHeaderText: {
    flex: 1,
  },

  activityModalTitle: {
    ...typography.h2,
    color: colors.text,
  },

  activityModalSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  activityModalContent: {
    padding: spacing.lg,
    paddingBottom: spacing["2xl"],
  },

  activityDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  activityDetailIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },

  activityDetailHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  activityDetailTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  activityDetailDate: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  activityUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  activityUserText: {
    ...typography.small,
    color: colors.textSecondary,
  },

  activityChangesContainer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surfaceSoft,
  },

  activityChangesTitle: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  activityEmptyDetails: {
    marginTop: spacing.sm,
    ...typography.small,
    color: colors.textMuted,
  },

  removedItemsList: {
    marginTop: spacing.sm,
  },

  removedItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },

  removedItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  removedItemMain: {
    flex: 1,
  },

  removedItemName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  removedItemType: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 1,
  },

  removedItemQuantity: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  removedItemTotal: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  activityChangesList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },

  activityChangeRow: {
    gap: 4,
  },

  activityChangeField: {
    ...typography.caption,
    color: colors.textMuted,
  },

  activityChangeValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  activityChangeFrom: {
    ...typography.small,
    color: colors.textSecondary,
    flexShrink: 1,
  },

  activityChangeTo: {
    ...typography.small,
    color: colors.text,
    fontWeight: "600",
    flexShrink: 1,
  },

  activityModalBottomSpace: {
    height: spacing.md,
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
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: spacing.sm,
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: theme.radius.xs,
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
    borderRadius: theme.radius.full,
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

  voidModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },

  voidModalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },

  voidModal: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: spacing.xl,
  },

  voidModalIcon: {
    width: 54,
    height: 54,
    borderRadius: theme.radius.full,
    backgroundColor: colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.md,
  },

  voidModalTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },

  voidModalSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 19,
  },

  voidModalWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.dangerLight,
  },

  voidModalWarningText: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  voidReasonLabel: {
    ...typography.bodyMedium,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },

  voidReasonInput: {
    minHeight: 100,
    paddingTop: spacing.md,
  },

  voidModalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  voidCancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  voidCancelText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },

  voidConfirmButton: {
    flex: 1.4,
    minHeight: 50,
    borderRadius: theme.radius.md,
    backgroundColor: colors.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },

  voidConfirmButtonPressed: {
    opacity: 0.8,
  },

  voidConfirmButtonDisabled: {
    opacity: 0.5,
  },

  voidConfirmText: {
    ...typography.bodyMedium,
    color: colors.surface,
  },

  errorScreen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing["2xl"],
  },

  errorAction: {
    marginTop: spacing.lg,
  },
});
