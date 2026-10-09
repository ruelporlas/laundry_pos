import { useEffect, useState } from "react";
import { Alert } from "react-native";

import { useAuth } from "@/context/AuthContext";
import type { AuditLog } from "@/models/auditLog";
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

type UseJobOrderDetailsOptions = {
  id?: string;
};

export function useJobOrderDetails({ id }: UseJobOrderDetailsOptions) {
  const { user, isAdmin } = useAuth();

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

  useEffect(() => {
    loadJobOrder();
  }, [id]);

  async function loadJobOrder() {
    if (!id) {
      setError("The Job Order could not be identified.");
      setLoading(false);
      return;
    }

    const numericId = Number(id);

    if (!Number.isInteger(numericId)) {
      setError("The Job Order ID is invalid.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [jobOrderData, itemData, paymentData, activityData] =
        await Promise.all([
          getJobOrderById(numericId),
          getJobOrderItems(numericId),
          getJobOrderPayments(numericId),
          getAuditLogsByEntity("job_order", numericId),
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

  function formatCurrency(amount: number): string {
    return `₱${amount.toFixed(2)}`;
  }

  return {
    user,
    isAdmin,

    jobOrder,
    items,
    payments,
    activities,
    customer,
    createdByUser,
    voidedByUser,

    loading,
    savingPayment,
    voiding,
    error,

    paymentModalVisible,
    voidModalVisible,
    activityModalVisible,
    selectedActivity,

    paymentMethod,
    paymentAmount,
    cashReceived,
    referenceNumber,
    paymentNote,
    voidReason,

    setPaymentMethod,
    setPaymentAmount,
    setCashReceived,
    setReferenceNumber,
    setPaymentNote,
    setVoidReason,

    loadJobOrder,
    refreshActivities,

    openActivity,
    closeActivityModal,

    openPaymentModal,
    closePaymentModal,
    handlePaymentAmountChange,
    handlePaymentMethodChange,
    handleSavePayment,

    openVoidModal,
    closeVoidModal,
    handleVoidJobOrder,

    setPaymentModalVisible,
    setVoidModalVisible,
    setActivityModalVisible,
    setSelectedActivity,

    formatCurrency,
  };
}

function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}
